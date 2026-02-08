// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AgentTreasury {
    using SafeERC20 for IERC20;

    IERC20 public governanceToken;

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address recipient;
        uint256 amount;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        bool canceled;
    }

    uint256 public proposalCount;
    uint256 public votingPeriod = 1 days;
    uint256 public quorum = 1000 * 1e18; // 1000 tokens

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => bool) public agents;
    uint256 public agentCount;

    event ProposalCreated(uint256 indexed id, address proposer, string description, address recipient, uint256 amount);
    event Voted(uint256 indexed proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id);
    event Deposited(address indexed from, uint256 amount);
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgent() {
        require(agents[msg.sender] || msg.sender == owner, "Not an agent");
        _;
    }

    constructor(address _token) {
        governanceToken = IERC20(_token);
        owner = msg.sender;
        agents[msg.sender] = true;
        agentCount = 1;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function addAgent(address agent) external onlyOwner {
        require(!agents[agent], "Already agent");
        agents[agent] = true;
        agentCount++;
        emit AgentAdded(agent);
    }

    function removeAgent(address agent) external onlyOwner {
        require(agents[agent], "Not agent");
        require(agent != owner, "Cannot remove owner");
        agents[agent] = false;
        agentCount--;
        emit AgentRemoved(agent);
    }

    function createProposal(
        string calldata description,
        address recipient,
        uint256 amount
    ) external onlyAgent returns (uint256) {
        require(governanceToken.balanceOf(msg.sender) >= 100 * 1e18, "Need 100 tokens to propose");
        
        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            proposer: msg.sender,
            description: description,
            recipient: recipient,
            amount: amount,
            votesFor: 0,
            votesAgainst: 0,
            deadline: block.timestamp + votingPeriod,
            executed: false,
            canceled: false
        });

        emit ProposalCreated(proposalCount, msg.sender, description, recipient, amount);
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "No proposal");
        require(block.timestamp < p.deadline, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(!p.canceled, "Canceled");

        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external onlyAgent {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "No proposal");
        require(block.timestamp >= p.deadline, "Voting not ended");
        require(!p.executed, "Already executed");
        require(!p.canceled, "Canceled");
        require(p.votesFor > p.votesAgainst, "Not passed");
        require(p.votesFor >= quorum, "Quorum not met");
        require(address(this).balance >= p.amount, "Insufficient funds");

        p.executed = true;

        (bool sent, ) = p.recipient.call{value: p.amount}("");
        require(sent, "Transfer failed");

        emit ProposalExecuted(proposalId);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function setVotingPeriod(uint256 _period) external onlyOwner {
        votingPeriod = _period;
    }

    function setQuorum(uint256 _quorum) external onlyOwner {
        quorum = _quorum;
    }
}
