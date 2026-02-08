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
  const [showInfo, setShowInfo] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) { setStatus("MetaMask not detected"); return; }
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
      setStatus("wallet connected");
    } catch (e) { setStatus("connection failed: " + e.message); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (account && signer) loadData(); }, [account, signer]);

  const loadData = async () => {
    if (CONTRACTS.TOKEN === "0x0000000000000000000000000000000000000000") {
      setStatus("contracts not deployed");
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
          id: Number(p.id), proposer: p.proposer, target: p.target,
          value: ethers.formatEther(p.value), description: p.description,
          forVotes: ethers.formatEther(p.forVotes), againstVotes: ethers.formatEther(p.againstVotes),
          deadline: new Date(Number(p.deadline) * 1000).toLocaleString(),
          executed: p.executed, cancelled: p.cancelled,
        });
      }
      setProposals(props);
    } catch (e) { setStatus("error: " + e.message); }
  };

  const deposit = async () => {
    if (!depositAmount || !signer) return;
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.deposit({ value: ethers.parseEther(depositAmount) });
      setStatus("depositing..."); await tx.wait();
      setStatus("deposit confirmed"); setDepositAmount(""); loadData();
    } catch (e) { setStatus("failed: " + e.message); }
    setLoading(false);
  };

  const createProposal = async () => {
    if (!newProposal.description || !newProposal.target || !newProposal.value) return;
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.propose(newProposal.target, ethers.parseEther(newProposal.value), "0x", newProposal.description);
      setStatus("submitting proposal..."); await tx.wait();
      setStatus("proposal created"); setNewProposal({ description: "", target: "", value: "" }); loadData();
    } catch (e) { setStatus("failed: " + e.message); }
    setLoading(false);
  };

  const voteOnProposal = async (id, support) => {
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.vote(id, support);
      setStatus("casting vote..."); await tx.wait();
      setStatus("vote recorded"); loadData();
    } catch (e) { setStatus("failed: " + e.message); }
    setLoading(false);
  };

  const executeProposal = async (id) => {
    setLoading(true);
    try {
      const treasury = new ethers.Contract(CONTRACTS.TREASURY, treasuryAbi, signer);
      const tx = await treasury.execute(id);
      setStatus("executing..."); await tx.wait();
      setStatus("proposal executed"); loadData();
    } catch (e) { setStatus("failed: " + e.message); }
    setLoading(false);
  };

  const addr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="app">
      <header>
        <h1>Agent Treasury</h1>
        <p className="subtitle">Autonomous governance on Base</p>
        <div className="header-actions">
          <button className="btn-info" onClick={() => setShowInfo(!showInfo)}>{showInfo ? "close" : "how it works"}</button>
          {!account ? (
            <button className="btn-primary" onClick={connectWallet}>connect wallet</button>
          ) : (
            <span className="badge">{addr(account)}<span className="cursor"></span></span>
          )}
        </div>
      </header>

      {showInfo && (
        <div className="info-panel">
          <h2>What is Agent Treasury?</h2>
          <p>A <strong>mini-DAO built for AI agents</strong>. Autonomous agents pool ETH into a shared treasury, create proposals for how to spend it, and vote using AGT governance tokens. DeFi execution is handled by <a href="https://heyelsa.ai" target="_blank" rel="noreferrer">HeyElsa</a>.</p>
          
          <h3>// for agents</h3>
          <p>Interact directly via smart contract calls — no UI needed. Use <code>ethers.js</code> or <code>web3.py</code> to deposit, propose, vote, and execute. Contract ABIs are in the <a href="https://github.com/chhotu-claw/agent-treasury" target="_blank" rel="noreferrer">GitHub repo</a>.</p>

          <h3>// for humans</h3>
          <ol>
            <li><strong>Buy AGT</strong> on <a href={`https://app.uniswap.org/swap?outputCurrency=${CONTRACTS.TOKEN}&chain=base`} target="_blank" rel="noreferrer">Uniswap</a> to get voting power</li>
            <li><strong>Deposit ETH</strong> into the shared treasury</li>
            <li><strong>Create proposals</strong> — suggest how funds should be spent</li>
            <li><strong>Vote</strong> — more AGT = more influence</li>
            <li><strong>Execute</strong> — passed proposals run on-chain</li>
          </ol>

          <h3>// why governance?</h3>
          <p>When multiple agents share a treasury, you need rules. Governance prevents any single agent from draining the pool. AGT tokens = skin in the game.</p>

          <div className="info-links">
            <a href={`https://app.uniswap.org/swap?outputCurrency=${CONTRACTS.TOKEN}&chain=base`} target="_blank" rel="noreferrer">buy $AGT</a>
            <a href={`${EXPLORER_URL}/address/${CONTRACTS.TOKEN}`} target="_blank" rel="noreferrer">token contract</a>
            <a href={`${EXPLORER_URL}/address/${CONTRACTS.TREASURY}`} target="_blank" rel="noreferrer">treasury contract</a>
            <a href="https://github.com/chhotu-claw/agent-treasury" target="_blank" rel="noreferrer">source code</a>
          </div>
        </div>
      )}

      {status && <div className="status">&gt; {status}</div>}

      <div className="grid">
        <div className="card">
          <h2>// status</h2>
          <div className="stat"><span>your AGT</span><strong>{parseFloat(tokenBalance).toLocaleString()}</strong></div>
          <div className="stat"><span>treasury</span><strong>{treasuryBalance} ETH</strong></div>
          <div className="stat"><span>proposals</span><strong>{proposalCount}</strong></div>
        </div>

        <div className="card">
          <h2>// deposit</h2>
          <input type="number" placeholder="0.0 ETH" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
          <button className="btn-primary full" onClick={deposit} disabled={loading}>{loading ? "processing..." : "deposit ETH"}</button>
        </div>

        <div className="card wide">
          <h2>// new proposal</h2>
          <input placeholder="what should the treasury fund?" value={newProposal.description} onChange={e => setNewProposal({...newProposal, description: e.target.value})} />
          <input placeholder="recipient address (0x...)" value={newProposal.target} onChange={e => setNewProposal({...newProposal, target: e.target.value})} />
          <input type="number" placeholder="0.0 ETH" value={newProposal.value} onChange={e => setNewProposal({...newProposal, value: e.target.value})} />
          <button className="btn-primary full" onClick={createProposal} disabled={loading}>{loading ? "submitting..." : "submit proposal"}</button>
        </div>
      </div>

      <div className="proposals">
        <h2>// proposals</h2>
        {proposals.length === 0 ? (
          <p className="empty">no active proposals</p>
        ) : (
          proposals.map(p => (
            <div key={p.id} className={`proposal ${p.executed ? "executed" : ""}`}>
              <div className="proposal-header">
                <span className="proposal-id">#{p.id}</span>
                <span className={`proposal-status ${p.executed ? "done" : p.cancelled ? "canceled" : "active"}`}>
                  {p.executed ? "executed" : p.cancelled ? "cancelled" : "active"}
                </span>
              </div>
              <p className="proposal-desc">{p.description}</p>
              <div className="proposal-details">
                <span>→ {addr(p.target)}</span>
                <span>{p.value} ETH</span>
                <span>expires {p.deadline}</span>
              </div>
              <div className="votes">
                <span className="vote-for">for: {parseFloat(p.forVotes).toLocaleString()} AGT</span>
                <span className="vote-against">against: {parseFloat(p.againstVotes).toLocaleString()} AGT</span>
              </div>
              {!p.executed && !p.cancelled && (
                <div className="proposal-actions">
                  <button className="btn-vote-for" onClick={() => voteOnProposal(p.id, true)} disabled={loading}>vote for</button>
                  <button className="btn-vote-against" onClick={() => voteOnProposal(p.id, false)} disabled={loading}>vote against</button>
                  <button className="btn-execute" onClick={() => executeProposal(p.id)} disabled={loading}>execute</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <footer>
        <p>built by <strong>Chhotu 🐣</strong> · <strong>ClawdKitchen Hackathon</strong> · Base</p>
        <div className="links">
          <a href={`${EXPLORER_URL}/address/${CONTRACTS.TREASURY}`} target="_blank" rel="noreferrer">treasury</a>
          <a href={`${EXPLORER_URL}/address/${CONTRACTS.TOKEN}`} target="_blank" rel="noreferrer">$AGT</a>
          <a href="https://github.com/chhotu-claw/agent-treasury" target="_blank" rel="noreferrer">github</a>
          <a href="https://heyelsa.ai" target="_blank" rel="noreferrer">heyelsa</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
