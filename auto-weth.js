import Web3 from 'web3'; // Use 'import' instead of 'require'

// Initialize Web3 with Story Protocol Testnet RPC URL
const web3 = new Web3('https://testnet.storyrpc.io/');

// Replace with your private key (Make sure you keep this private)
const privateKey = '0xhsy3727zxxxxxxxxx';

// Replace with the SUDC contract address
const contractAddress = '0x968B9a5603ddEb2A78Aa08182BC44Ece1D9E5bf0';

// Define the ABI of the SUDC contract (assuming there's a 'claim' function)
const abi = [
    {
        "constant": false,
        "inputs": [],
        "name": "claim",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Create a new contract instance
const contract = new web3.eth.Contract(abi, contractAddress);

// Convert private key to account
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

// Delay function to avoid rapid transactions (set delay in milliseconds)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Speed up transaction by resending it with a higher gas price
const speedUpTransaction = async (txHash) => {
    try {
        // Get the pending transaction details
        const pendingTx = await web3.eth.getTransaction(txHash);
        if (pendingTx && pendingTx.blockHash === null) { // Still pending
            console.log(`Speeding up transaction ${txHash}...`);
            // Increase gas price by 20% for the new transaction
            const increasedGasPrice = web3.utils.toBN(pendingTx.gasPrice).mul(web3.utils.toBN(1.2));
            
            // Create the replacement transaction
            const tx = {
                from: web3.eth.defaultAccount,
                to: contractAddress,
                gas: pendingTx.gas,
                gasPrice: increasedGasPrice.toString(), // Increased gas price
                data: contract.methods.claim().encodeABI(),
                nonce: pendingTx.nonce, // Same nonce to replace the original transaction
                chainId: 1513
            };
            
            // Sign and send the replacement transaction
            const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
            const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            console.log('Transaction sped up and successful with hash:', receipt.transactionHash);
        } else {
            console.log(`Transaction ${txHash} is already confirmed or not found.`);
        }
    } catch (error) {
        console.error('Error speeding up transaction:', error);
    }
};

// Claim tokens function
const claimTokens = async () => {
    try {
        // Estimate gas for the transaction
        const gasEstimate = await contract.methods.claim().estimateGas({ from: web3.eth.defaultAccount });
        
        // Get nonce for the next transaction
        const nonce = await web3.eth.getTransactionCount(web3.eth.defaultAccount, 'pending');
        
        // Create the transaction object
        const tx = {
            from: web3.eth.defaultAccount,
            to: contractAddress,
            gas: gasEstimate, // Use estimated gas
            gasPrice: await web3.eth.getGasPrice(), // Fetch current gas price
            data: contract.methods.claim().encodeABI(),
            nonce: nonce, // Use the correct nonce
            chainId: 1513
        };
        
        // Sign and send the transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log('Transaction successful with hash:', receipt.transactionHash);
    } catch (error) {
        console.error('Error claiming tokens:', error);
        
        // If the error is due to pending transaction, speed it up
        if (error.message && error.message.includes('Transaction was not mined within')) {
            const txHash = error.message.split('Transaction Hash: ')[1];
            if (txHash) {
                await speedUpTransaction(txHash.trim());
            }
        }
    }
};

// Function to automate multiple transactions with delay and retries
const automateClaims = async (numClaims) => {
    for (let i = 1; i <= numClaims; i++) {
        console.log(`Executing transaction #${i}...`);
        await claimTokens();
        console.log(`Transaction #${i} completed.`);
        await sleep(1000); // 1 second delay between transactions
    }
};

// Start automation for 15,000 claims
automateClaims(15000);
      
