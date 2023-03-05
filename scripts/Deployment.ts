import {ethers} from "ethers";
import * as dotenv from 'dotenv';
import { Ballot__factory } from "../typechain-types";
dotenv.config();

function convertStringArrayToBytes32(array: string[]) {
    const bytes32Array = [];
    for (let index = 0; index < array.length; index++) {
        bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
    }
    return bytes32Array;
}

async function main() {
    const args = process.argv;
    const proposals = args.slice(2);
    if (proposals.length <= 0) throw new Error("Missing proposals");
    const provider = ethers.getDefaultProvider("goerli");
    const privatekey = process.env.PRIVATE_KEY;
    if(!privatekey || privatekey.length <= 0 ) throw new Error("Missing private key")
    const wallet = new ethers.Wallet(privatekey);
    const signer = wallet.connect(provider);
    const balance = await signer.getBalance();
    console.log(`Blance = ${balance}`);
        console.log("Deploying Ballot contract")
    console.log("Proposals:");
    proposals.forEach((element, index) => {
        console.log(`Proposal ${index + 1}: ${element}`)
    });
    
    const ballotContractFactory = new Ballot__factory(signer)
    console.log("Deploying contract...");
    const ballotContract = await ballotContractFactory.deploy(convertStringArrayToBytes32(proposals));
    
    const deployTxReceipt = await ballotContract.deployTransaction.wait();
    console.log(`The Ballot contract was deployed at the address ${ballotContract.address}`);
    console.log(deployTxReceipt);
        
}

main().catch((error) => {
    console.log(error);
    process.exitCode = 1;
}
)