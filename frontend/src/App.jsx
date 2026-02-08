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
  const [newProposal, setNewProposal] = useState({ description: "", recipient: "", amount: "" });
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

  useEffect(() => { if (account && signer) loadData(); }, [account, signer]);

  const loadData = async () => {
    if (!signer || CONTRACTS.TOKEN === "0x0000000000000000000000000000000000000000") {
      setStatus("Contracts not yet deployed — need Base Sepolia testnet ETH. Use a faucet to fund deployer.");
      return;
    }
    try {
      const token = new ethers.Contract(CONTRACTS.TOKEN, tokenAbi, signer);
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      setTokenBalance(ethers.formatEther(await token.balanceOf(account)));
      setTreasuryBalance(ethers.formatEther(await treasury.treasuryBalance()));
      const count = Number(await treasury.proposalCount());
      setProposalCount(count);
      const props = [];
      for (let i = 1; i <= count; i++) {
        const p = await treasury.getProposal(i);
        props.push({ id: Number(p.id), proposer: p.proposer, description: p.description, recipient: p.recipient, amount: ethers.formatEther(p.amount), votesFor: ethers.formatEther(p.votesFor), votesAgainst: ethers.formatEther(p.votesAgainst), deadline: new Date(Number(p.deadline) * 1000).toLocaleString(), executed: p.executed, canceled: p.canceled });
      }
      setProposals(props);
    } catch (e) { setStatus("Error: " + e.message); }
  };

  const deposit = async () => {
    if (!depositAmount || !signer) return;
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.deposit({ value: ethers.parseEther(depositAmount) });
      setStatus("Depositing..."); await tx.wait();
      setStatus("Deposit successful!"); setDepositAmount(""); loadData();
    } catch (e) { setStatus("Failed: " + e.message); }
    setLoading(false);
  };

  const createProposal = async () => {
    if (!newProposal.description || !newProposal.recipient || !newProposal.amount) return;
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.createProposal(newProposal.description, newProposal.recipient, ethers.parseEther(newProposal.amount));
      setStatus("Creating..."); await tx.wait();
      setStatus("Proposal created!"); setNewProposal({ description: "", recipient: "", amount: "" }); loadData();
    } catch (e) { setStatus("Failed: " + e.message); }
    setLoading(false);
  };

  const vote = async (id, support) => {
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.vote(id, support); setStatus("Voting..."); await tx.wait();
      setStatus("Vote cast!"); loadData();
    } catch (e) { setStatus("Failed: " + e.message); }
    setLoading(false);
  };

  const execute = async (id) => {
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.executeProposal(id); setStatus("Executing..."); await tx.wait();
      setStatus("Executed!"); loadData();
    } catch (e) { setStatus("Failed: " + e.message); }
    setLoading(false);
  };

  return (
    <div className="app">
      <header>
        <h1>🏦 Agent Treasury</h1>
        <p className="subtitle">AI-Powered Mini-DAO on Base</p>
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
          <div className="stat"><span>AGENT Tokens</span><strong>{parseFloat(tokenBalance).toLocaleString()}</strong></div>
          <div className="stat"><span>Treasury</span><strong>{treasuryBalance} ETH</strong></div>
          <div className="stat"><span>Proposals</span><strong>{proposalCount}</strong></div>
        </div>
        <div className="card">
          <h2>💰 Deposit ETH</h2>
          <input type="number" placeholder="Amount in ETH" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
          <button className="btn-primary" onClick={deposit} disabled={loading}>{loading ? "..." : "Deposit"}</button>
        </div>
        <div className="card wide">
          <h2>📝 Create Proposal</h2>
          <input placeholder="Description" value={newProposal.description} onChange={e => setNewProposal({...newProposal, description: e.target.value})} />
          <input placeholder="Recipient (0x...)" value={newProposal.recipient} onChange={e => setNewProposal({...newProposal, recipient: e.target.value})} />
          <input type="number" placeholder="Amount in ETH" value={newProposal.amount} onChange={e => setNewProposal({...newProposal, amount: e.target.value})} />
          <button className="btn-primary" onClick={createProposal} disabled={loading}>{loading ? "..." : "Create Proposal"}</button>
        </div>
      </div>
      <div className="proposals">
        <h2>🗳️ Proposals</h2>
        {proposals.length === 0 ? <p className="empty">No proposals yet</p> : proposals.map(p => (
          <div key={p.id} className={`proposal ${p.executed ? "executed" : ""}`}>
            <div className="proposal-header">
              <span className="proposal-id">#{p.id}</span>
              <span className={`proposal-status ${p.executed ? "done" : p.canceled ? "canceled" : "active"}`}>
                {p.executed ? "✅ Executed" : p.canceled ? "❌ Canceled" : "🟡 Active"}
              </span>
            </div>
            <p className="proposal-desc">{p.description}</p>
            <div className="proposal-details">
              <span>To: {p.recipient.slice(0,8)}...{p.recipient.slice(-4)}</span>
              <span>{p.amount} ETH</span>
              <span>Deadline: {p.deadline}</span>
            </div>
            <div className="votes">
              <span className="vote-for">👍 {parseFloat(p.votesFor).toLocaleString()}</span>
              <span className="vote-against">👎 {parseFloat(p.votesAgainst).toLocaleString()}</span>
            </div>
            {!p.executed && !p.canceled && (
              <div className="proposal-actions">
                <button className="btn-vote-for" onClick={() => vote(p.id, true)} disabled={loading}>Vote For</button>
                <button className="btn-vote-against" onClick={() => vote(p.id, false)} disabled={loading}>Vote Against</button>
                <button className="btn-execute" onClick={() => execute(p.id)} disabled={loading}>Execute</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <footer>
        <p>Built for ClawdKitchen Hackathon | Base Sepolia</p>
        <div className="links">
          <a href={`${EXPLORER_URL}/address/${CONTRACTS.TREASURY}`} target="_blank">Treasury</a>
          <a href={`${EXPLORER_URL}/address/${CONTRACTS.TOKEN}`} target="_blank">Token</a>
          <a href="https://github.com/AyushRungworker/agent-treasury" target="_blank">GitHub</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
