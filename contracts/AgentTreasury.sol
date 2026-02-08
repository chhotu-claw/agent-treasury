// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IGovernanceToken {
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function mint(address, uint256) external;
}

/// @title AgentTreasury - Mini-DAO for AI Agents
/// @notice AI agents pool ETH, propose transactions, vote, and execute
contract AgentTreasury is Ownable, ReentrancyGuard {
    IGovernanceToken public govToken;

    struct Proposal {
        uint256 id;
        address proposer;
        address target;
        uint256 value;
        bytes data;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
        bool cancelled;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256 public votingPeriod = 1 days;
    uint256 public quorumPercent = 20; // 20% of total supply

    event Deposited(address indexed agent, uint256 amount);
    event ProposalCreated(uint256 indexed id, address proposer, address target, uint256 value, string description);
    event Voted(uint256 indexed id, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id);
    event ProposalCancelled(uint256 indexed id);
    event AgentRegistered(address indexed agent, uint256 tokensGranted);

    constructor(address _govToken) {
        govToken = IGovernanceToken(_govToken);
    }

    /// @notice Deposit ETH into the treasury
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Register a new agent and grant them voting tokens
    function registerAgent(address agent, uint256 tokenAmount) external onlyOwner {
        govToken.mint(agent, tokenAmount);
        emit AgentRegistered(agent, tokenAmount);
    }

    /// @notice Create a proposal to send ETH or call a contract
    function propose(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata description
    ) external returns (uint256) {
        require(govToken.balanceOf(msg.sender) > 0, "Must hold tokens");

        proposalCount++;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            proposer: msg.sender,
            target: target,
            value: value,
            data: data,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            deadline: block.timestamp + votingPeriod,
            executed: false,
            cancelled: false
        });

        emit ProposalCreated(proposalCount, msg.sender, target, value, description);
        return proposalCount;
    }

    /// @notice Vote on a proposal (weight = token balance)
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "No such proposal");
        require(block.timestamp < p.deadline, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 weight = govToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /// @notice Execute a passed proposal
    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "No such proposal");
        require(block.timestamp >= p.deadline, "Voting not ended");
        require(!p.executed, "Already executed");
        require(!p.cancelled, "Cancelled");
        require(p.forVotes > p.againstVotes, "Not passed");

        // Check quorum
        uint256 totalVotes = p.forVotes + p.againstVotes;
        uint256 quorum = (govToken.totalSupply() * quorumPercent) / 100;
        require(totalVotes >= quorum, "Quorum not met");

        p.executed = true;

        (bool success, ) = p.target.call{value: p.value}(p.data);
        require(success, "Execution failed");

        emit ProposalExecuted(proposalId);
    }

    /// @notice Cancel a proposal (only proposer or owner)
    function cancel(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(msg.sender == p.proposer || msg.sender == owner(), "Not authorized");
        require(!p.executed, "Already executed");
        p.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    /// @notice Update voting period
    function setVotingPeriod(uint256 _period) external onlyOwner {
        votingPeriod = _period;
    }

    /// @notice Update quorum percentage
    function setQuorumPercent(uint256 _percent) external onlyOwner {
        require(_percent <= 100, "Invalid");
        quorumPercent = _percent;
    }

    /// @notice Get treasury ETH balance
    function treasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get proposal details
    function getProposal(uint256 id) external view returns (Proposal memory) {
        return proposals[id];
    }
}
