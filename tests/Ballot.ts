import {ethers} from "hardhat";
import {Ballot} from "../typechain-types";
import { expect } from "chai";

const PROPOSALS = ["P1", "P2", "P3"];

function convertStringArrayToBytes32(array: string[]) {
    const bytes32Array = [];
    for (let index = 0; index < array.length; index++) {
        bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
    }
    return bytes32Array;
}

describe("Ballot", function () {
    let ballotContract: Ballot;

    beforeEach(async function () {
        const ballotContractFactory = await ethers.getContractFactory("Ballot");
        ballotContract = await ballotContractFactory.deploy(convertStringArrayToBytes32(PROPOSALS)
            );
        await ballotContract.deployTransaction.wait();
    })

    describe("when the contract is deployed", function () {
        it("has the provided proposals", async function () {
            for (let index = 0; index < PROPOSALS.length; index++) {
                const proposal = await ballotContract.proposals(index);
                expect(ethers.utils.parseBytes32String(proposal.name)).to.eq(PROPOSALS[index]);
            }
        });
        
        it("has zero votes for all proposals", async function () {
            for (let index = 0; index < PROPOSALS.length; index++) {
                const proposal = await ballotContract.proposals(index);
                expect(proposal.voteCount).to.eq(0);
            }
          });

          it("sets the deployer address as chairperson", async function () {
            const signers = await ethers.getSigners();
            const deployer = signers[0].address;
            const chairperson = await ballotContract.chairperson();
            expect(chairperson).to.eq(deployer);
          });

          it("sets the voting weight for the chairperson as 1", async function () {
            const chairperson = await ballotContract.chairperson();
            const voterChairperson = await ballotContract.voters(chairperson);
            expect(voterChairperson.weight ).to.eq(1);
          });
        });
      
        describe("when the chairperson interacts with the giveRightToVote function in the contract", function () {
          it("gives right to vote for another address", async function () {
            const signers = await ethers.getSigners();
            const chairperson = signers[0];
            const anotherAddress = signers[1].address;
            const anotherAddressWeight1 = await (await ballotContract.voters(anotherAddress)).weight;
            const tx = await ballotContract.connect(chairperson).giveRightToVote(anotherAddress);
            await tx.wait();
            const anotherAddressWeight2 = await (await ballotContract.voters(anotherAddress)).weight;
            expect(anotherAddressWeight1).to.eq(0);
            expect(anotherAddressWeight2).to.eq(1);
          });
          it("can not give right to vote for someone that has voted", async function () {
            const signers = await ethers.getSigners();
            const chairperson = signers[0];
            const another = signers[1];
            const tx1 = await ballotContract.connect(chairperson).giveRightToVote(another.address);
            await tx1.wait();
            const tx2 = await ballotContract.connect(another).vote(1);
            await tx2.wait();
            await expect(ballotContract.connect(chairperson).giveRightToVote(another.address)).to.be.revertedWith("The voter already voted.");
          });
          it("can not give right to vote for someone that has already voting rights", async function () {
            const signers = await ethers.getSigners();
            const chairperson = signers[0];
            const another = signers[1];
            const tx1 = await ballotContract.connect(chairperson).giveRightToVote(another.address);
            await tx1.wait();
            await expect(ballotContract.connect(chairperson).giveRightToVote(another.address)).to.be.reverted;
          });
        });
      
        describe("when the voter interact with the vote function in the contract", function () {
          it("should register the vote", async () => {
            const signers = await ethers.getSigners();
            const chairperson = signers[0];
            const voter = signers[1];
            const tx1 = await ballotContract.connect(chairperson).giveRightToVote(voter.address);
            await tx1.wait();
            const tx2 = await ballotContract.connect(voter).vote(2);
            await tx2.wait();
            const winningProposal = await ballotContract.winningProposal();
            expect(winningProposal).to.eq(2);
          });
        });
      
        describe("when the voter interact with the delegate function in the contract", function () {
          it("should transfer voting power", async () => {
            const signers = await ethers.getSigners();
            const chairperson = signers[0];
            const voter1 = signers[2];            
            const another = signers[3];
            const tx0 = await ballotContract.connect(chairperson).giveRightToVote(voter1.address);
            await tx0.wait();
            const tx1 = await ballotContract.connect(chairperson).giveRightToVote(another.address);
            await tx1.wait();
            const votingPowerBefore = await (await ballotContract.voters(another.address)).weight;
            const tx3 = await ballotContract.connect(voter1).delegate(another.address);
            const votingPowerAfter = await (await ballotContract.voters(another.address)).weight;
            await tx3.wait();
            expect(votingPowerBefore).to.be.below(votingPowerAfter);        
          });
        });
      
        // describe("when the an attacker interact with the giveRightToVote function in the contract", function () {
        //   // TODO
        //   it("should revert", async () => {
        //     throw Error("Not implemented");
        //   });
        // });
      
        // describe("when the an attacker interact with the vote function in the contract", function () {
        //   // TODO
        //   it("should revert", async () => {
        //     throw Error("Not implemented");
        //   });
        // });
      
        // describe("when the an attacker interact with the delegate function in the contract", function () {
        //   // TODO
        //   it("should revert", async () => {
        //     throw Error("Not implemented");
        //   });
        // });
      
        describe("when someone interact with the winningProposal function before any votes are cast", function () {
          it("should return 0", async () => {
            const winningProposal = await ballotContract.winningProposal();
            expect(winningProposal).to.eq(0);
          });
        });
      
        describe("when someone interact with the winningProposal function after one vote is cast for the first proposal", function () {
          it("should return 0", async () => {
            const signers = await ethers.getSigners();
            const chairperson = signers[0];
            const someone = signers[1];
            const tx1 = await ballotContract.connect(chairperson).vote(0);
            await tx1.wait();
            const winningProposal = await ballotContract.winningProposal();
            expect(winningProposal).to.eq(0);
          });
        });
      
        describe("when someone interact with the winnerName function before any votes are cast", function () {
          it("should return name of proposal 0", async () => {
            const winnerName = await ballotContract.winnerName();
            expect(winnerName).to.eq(ethers.utils.formatBytes32String("P1"));
          });
        });
      
        describe("when someone interact with the winnerName function after one vote is cast for the first proposal", function () {
          // TODO
          it("should return name of proposal 0", async () => {
            const signers = await ethers.getSigners();
            const chairperson = signers[0];
            const someone = signers[1];
            const tx1 = await ballotContract.connect(chairperson).vote(0);
            await tx1.wait();
            const winnerName = await ballotContract.winnerName();
            expect(winnerName).to.eq(ethers.utils.formatBytes32String("P1"));
          });
        });
      
        describe("when someone interact with the winningProposal function and winnerName after 5 random votes are cast for the proposals", function () {
          // TODO
          it("should return the name of the winner proposal", async () => {
            const signers = await ethers.getSigners();
            const chairperson = signers[0];
            for (let i = 1; i < 6; i++) {
              console.log(i);
              const tx0 = await ballotContract.connect(chairperson).giveRightToVote(signers[i].address);
              await tx0.wait();
              const tx1 = await ballotContract.connect(signers[i]).vote(2);
              await tx1.wait();
              };

            const winnerName = await ballotContract.winnerName();
            expect(winnerName).to.eq(ethers.utils.formatBytes32String("P3"));
          });
        });

    })