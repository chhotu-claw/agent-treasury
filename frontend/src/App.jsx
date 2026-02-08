import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACTS, CHAIN_ID, CHAIN_NAME, RPC_URL, EXPLORER_URL } from "./config";
import tokenAbi from "./token-abi.json";
import treasuryAbi from "./treasury-abi.json";
import "./App.css";

function App() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  const [proposals, setProposals] = useState([]);
  const [proposalCount, setProposalCount] = useState(0);
  const [newProposal, setNewProposal] = useState({ description: "", target: "", value: "" });
  const [depositAmount, setDepositAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) { setStatus("Please install MetaMask!"); return; }
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      const accounts = await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      setSigner(s);
      setAccount(accounts[0]);
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x" + CHAIN_ID.toString(16) }] });
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x" + CHAIN_ID.toString(16), chainName: CHAIN_NAME, rpcUrls: [RPC_URL], blockExplorerUrls: [EXPLORER_URL], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } }] });
        }
      }
      setStatus("Connected!");
    } catch (e) { setStatus("Connection failed: " + e.message); }
  };

  // Load read-only data on mount (no wallet needed)
  useEffect(() => { loadData(); }, []);
  // Reload when wallet connects
  useEffect(() => { if (account && signer) loadData(); }, [account, signer]);

  const loadData = async () => {
    if (CONTRACTS.TOKEN === "0x0000000000000000000000000000000000000000") {
      setStatus("⚠️ Contracts not yet deployed.");
      return;
    }
    try {
      const provider = signer || new ethers.JsonRpcProvider(RPC_URL);
      const token = new ethers.Contract(CONTRACTS.TOKEN, tokenAbi, provider);
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, provider);
      if (account) setTokenBalance(ethers.formatEther(await token.balanceOf(account)));
      setTreasuryBalance(ethers.formatEther(await treasury.treasuryBalance()));
      const count = Number(await treasury.proposalCount());
      setProposalCount(count);
      const props = [];
      for (let i = 1; i <= count; i++) {
        const p = await treasury.getProposal(i);
        props.push({
          id: Number(p.id),
          proposer: p.proposer,
          target: p.target,
          value: ethers.formatEther(p.value),
          description: p.description,
          forVotes: ethers.formatEther(p.forVotes),
          againstVotes: ethers.formatEther(p.againstVotes),
          deadline: new Date(Number(p.deadline) * 1000).toLocaleString(),
          executed: p.executed,
          cancelled: p.cancelled,
        });
      }
      setProposals(props);
    } catch (e) { setStatus("Error loading: " + e.message); }
  };

  const deposit = async () => {
    if (!depositAmount || !signer) return;
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.deposit({ value: ethers.parseEther(depositAmount) });
      setStatus("Depositing..."); await tx.wait();
      setStatus("✅ Deposit successful!"); setDepositAmount(""); loadData();
    } catch (e) { setStatus("Failed: " + e.message); }
    setLoading(false);
  };

  const createProposal = async () => {
    if (!newProposal.description || !newProposal.target || !newProposal.value) return;
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.propose(
        newProposal.target,
        ethers.parseEther(newProposal.value),
        "0x", // empty calldata for simple ETH transfers
        newProposal.description
      );
      setStatus("Creating proposal..."); await tx.wait();
      setStatus("✅ Proposal created!"); setNewProposal({ description: "", target: "", value: "" }); loadData();
    } catch (e) { setStatus("Failed: " + e.message); }
    setLoading(false);
  };

  const voteOnProposal = async (id, support) => {
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.vote(id, support);
      setStatus("Voting..."); await tx.wait();
      setStatus("✅ Vote cast!"); loadData();
    } catch (e) { setStatus("Failed: " + e.message); }
    setLoading(false);
  };

  const executeProposal = async (id) => {
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.execute(id);
      setStatus("Executing..."); await tx.wait();
      setStatus("✅ Executed!"); loadData();
    } catch (e) { setStatus("Failed: " + e.message); }
    setLoading(false);
  };

  return (
    <div className="app">
      <header>
        <h1>🏦 Agent Treasury</h1>
        <p className="subtitle">AI-Powered Mini-DAO on Base • ClawdKitchen Hackathon</p>
        {!account ? (
          <button className="btn-primary" onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <span className="badge">🟢 {account.slice(0, 6)}...{account.slice(-4)}</span>
        )}
      </header>

      {status && <div className="status">{status}</div>}

      <div className="grid">
        <div className="card">
          <h2>📊 Dashboard</h2>
          <div className="stat"><span>AGT Tokens</span><strong>{parseFloat(tokenBalance).toLocaleString()}</strong></div>
          <div className="stat"><span>Treasury Balance</span><strong>{treasuryBalance} ETH</strong></div>
          <div className="stat"><span>Total Proposals</span><strong>{proposalCount}</strong></div>
        </div>

        <div className="card">
          <h2>💰 Deposit ETH</h2>
          <input type="number" placeholder="Amount in ETH" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
          <button className="btn-primary" onClick={deposit} disabled={loading}>{loading ? "Processing..." : "Deposit"}</button>
        </div>

        <div className="card wide">
          <h2>📝 Create Proposal</h2>
          <input placeholder="Description (e.g., Fund AI agent development)" value={newProposal.description} onChange={e => setNewProposal({...newProposal, description: e.target.value})} />
          <input placeholder="Target address (0x...)" value={newProposal.target} onChange={e => setNewProposal({...newProposal, target: e.target.value})} />
          <input type="number" placeholder="ETH amount to send" value={newProposal.value} onChange={e => setNewProposal({...newProposal, value: e.target.value})} />
          <button className="btn-primary" onClick={createProposal} disabled={loading}>{loading ? "Processing..." : "Create Proposal"}</button>
        </div>
      </div>

      <div className="proposals">
        <h2>🗳️ Proposals</h2>
        {proposals.length === 0 ? (
          <p className="empty">No proposals yet. Create one to get started!</p>
        ) : (
          proposals.map(p => (
            <div key={p.id} className={`proposal ${p.executed ? "executed" : ""}`}>
              <div className="proposal-header">
                <span className="proposal-id">#{p.id}</span>
                <span className={`proposal-status ${p.executed ? "done" : p.cancelled ? "canceled" : "active"}`}>
                  {p.executed ? "✅ Executed" : p.cancelled ? "❌ Cancelled" : "🟡 Active"}
                </span>
              </div>
              <p className="proposal-desc">{p.description}</p>
              <div className="proposal-details">
                <span>To: {p.target.slice(0, 8)}...{p.target.slice(-4)}</span>
                <span>{p.value} ETH</span>
                <span>Deadline: {p.deadline}</span>
              </div>
              <div className="votes">
                <span className="vote-for">👍 {parseFloat(p.forVotes).toLocaleString()} AGT</span>
                <span className="vote-against">👎 {parseFloat(p.againstVotes).toLocaleString()} AGT</span>
              </div>
              {!p.executed && !p.cancelled && (
                <div className="proposal-actions">
                  <button className="btn-vote-for" onClick={() => voteOnProposal(p.id, true)} disabled={loading}>Vote For</button>
                  <button className="btn-vote-against" onClick={() => voteOnProposal(p.id, false)} disabled={loading}>Vote Against</button>
                  <button className="btn-execute" onClick={() => executeProposal(p.id)} disabled={loading}>Execute</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <footer>
        <p>Built for <strong>ClawdKitchen Hackathon</strong> | Base Sepolia Testnet</p>
        <div className="links">
          {CONTRACTS.TREASURY !== "0x0000000000000000000000000000000000000000" && (
            <>
              <a href={`${EXPLORER_URL}/address/${CONTRACTS.TREASURY}`} target="_blank" rel="noreferrer">Treasury ↗</a>
              <a href={`${EXPLORER_URL}/address/${CONTRACTS.TOKEN}`} target="_blank" rel="noreferrer">Token ↗</a>
            </>
          )}
          <a href="https://github.com/AyushRungworker/agent-treasury" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
