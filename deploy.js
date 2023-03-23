const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractCreateFlow,
    ContractFunctionParameters,
    ContractExecuteTransaction,
    AccountCreateTransaction,
    Hbar
} = require('@hashgraph/sdk');
const fs = require('fs');

require('dotenv').config();

// Get operator from .env file
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

// Account creation function
async function accountCreator(pvKey, iBal) {
    console.log('-------------- accountCreater STARTED --------------')
    console.log(`pvKey: ${pvKey}, iBal: ${iBal}`)
    const response = await new AccountCreateTransaction()
        .setInitialBalance(new Hbar(iBal))
        .setKey(pvKey.publicKey)
        .execute(client);

    const txReceipt = await response.getReceipt(client);
    // console.log('---------------------- txReceipt ----------------------');
    // console.log(txReceipt);
    console.log('-------------- accountCreater ENDED --------------')
    return txReceipt.accountId;
}

const main = async () => {

    const newPrivateKey = PrivateKey.generateED25519();
    /* ED25519 PrivateKey is used to sign transactions that modify the state of an account, topic, token, smart contract, or file entity on the network. The public key can be shared with other users on the network.*/
    console.log(`newPrivateKey: ${newPrivateKey}`);

    const newAccountId = await accountCreator(newPrivateKey, 10);//sending a ED25519 privateKey to create a new Account 
    console.log(`newAccountId: ${newAccountId}`);

    const contractByteCode = fs.readFileSync('./bin/TokenCreator_sol_TokenCreator.bin');

    const createContract = new ContractCreateFlow()
        .setGas(150000) // Increase if revert
        .setBytecode(contractByteCode); // Contract bytecode

    console.log('-------------------- createContract COMPLETED ----------------- ');
    // console.log(createContract);
    // console.log('------------------------------------------------------');

    const createContractTx = await createContract.execute(client);
    const createContractRx = await createContractTx.getReceipt(client);
    const contractId = createContractRx.contractId;

    console.log(`Contract created with ID: ${contractId}`);

    // Create NFT using precompile function
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(300000) // Increase if revert
        .setPayableAmount(20) // Increase if revert
        .setFunction("createNonFungible", //smart contract functionName
            new ContractFunctionParameters()
            .addString("Fall Collection") //NFT name
            .addString("LEAF") // NFT symbol
            .addString("Just a memo") // NFT memo
            .addUint32(250) // NFT max supply
            .addUint32(7000000)); // auto renew period
    
    console.log('--------------- createToken COMPLETED -----------------');
    // console.log(createToken);
    // console.log('-----------------------------------------------');

    const txnResponse = await createToken.execute(client);

    console.log('--------------- txnResponse COMPLETED -----------------');
    // console.log(txnResponse);
    // console.log('-----------------------------------------------');

    const txnRecord = await txnResponse.getRecord(client);

    console.log('--------------- txnRecord COMPLETED -----------------');
    // console.log(txnRecord);
    // console.log('-----------------------------------------------');

    const tokenIdSolidityAddr = txnRecord.contractFunctionResult.getAddress(0);

    console.log('--------------- token Id in Solidity format -----------------');
    console.log(tokenIdSolidityAddr);
    // console.log('-----------------------------------------------');

    const tokenId = AccountId.fromSolidityAddress(tokenIdSolidityAddr);

    console.log('--------------- converted tokenId from solidity to hedera AccountId -----------------');
    // console.log(tokenId);
    // console.log('-----------------------------------------------');

    console.log(`Token created with ID: ${tokenId} \n`);

}

main();