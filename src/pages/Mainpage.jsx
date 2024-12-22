import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Header from '../components/Header';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import SendIcon from '@mui/icons-material/Send';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import nacl from "tweetnacl";
import { derivePath } from "ed25519-hd-key";
import bs58 from 'bs58';
import { ethers } from "ethers";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    clusterApiUrl,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircularProgress } from '@mui/material';
import toast, { Toaster } from 'react-hot-toast';

function Mainpage() {
    const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
    const [mnemonic, setMnemonic] = useState([]);
    const [seed, setSeed] = useState();
    const [network, setNetwork] = useState('ethereum');
    const [solanaKeypair, setSolanaKeypair] = useState([]);
    const [ethereumKeypair, setEthereumKeypair] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [sentLoading, setSentLoading] = useState(false)
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const handleGenerateMnemonic = () => {
        try {
            const mn = generateMnemonic();
            const mnemonicArray = mn.split(' ');
            const seedBuffer = mnemonicToSeedSync(mn);

            // Update state
            setMnemonic(mnemonicArray);
            setSeed(seedBuffer);

            // Store in local storage
            localStorage.setItem('mnemonic', JSON.stringify(mnemonicArray));
            localStorage.setItem('seed', seedBuffer.toString('hex'));
        } catch (error) {
            console.log('Error generating mnemonic:', error.message);
        }
    };

    const generateKeyPair = () => {
        if (!seed) {
            console.log('Seed not available. Generate mnemonic first.');
            return;
        }

        try {
            if (network === 'solana') {
                const path = `m/44'/501'/${solanaKeypair.length}'/0'`;
                const derivedSeed = derivePath(path, seed.toString('hex')).key;
                const secret = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey;
                const publicKey = Keypair.fromSecretKey(secret).publicKey.toBase58();
                const privateKey = bs58.encode(secret);

                const newKeyPair = { publicKey, privateKey };
                setSolanaKeypair((prev) => [...prev, newKeyPair]);

                // Store Solana keypair in local storage
                const existingPairs = JSON.parse(localStorage.getItem('solanaKeypair') || '[]');
                localStorage.setItem('solanaKeypair', JSON.stringify([...existingPairs, newKeyPair]));
            } else if (network === 'ethereum') {
                const path = `m/44'/60'/${ethereumKeypair.length}'/0'`;
                const derivedSeed = derivePath(path, seed.toString('hex')).key;
                const privateKey = Buffer.from(derivedSeed).toString('hex');
                const wallet = new ethers.Wallet(privateKey);
                const publicKey = wallet.address;

                const newKeyPair = { publicKey, privateKey };
                setEthereumKeypair((prev) => [...prev, newKeyPair]);
                handleGetEth(selectedAccount.publicKey);

                // Store Ethereum keypair in local storage
                const existingPairs = JSON.parse(localStorage.getItem('ethereumKeypair') || '[]');
                localStorage.setItem('ethereumKeypair', JSON.stringify([...existingPairs, newKeyPair]));
            } setOpen((prev) => !prev)
        } catch (error) {
            console.log('Error generating key pair:', error.message);
        }
    };

    const [selectedAccountEth, setSelectedAccountEth] = useState(null);
    const [selectedAccountSol, setSelectedAccountSol] = useState(null);

    const handleAccountSelect = (publicKey) => {
        if (network === 'ethereum') {
            const selected = ethereumKeypair.find(account => account.publicKey === publicKey);
            setSelectedAccountEth(selected);
            console.log(selected.publicKey)
            handleGetEth(selected.publicKey);
        } else if (network === 'solana') {
            const selected = solanaKeypair.find(account => account.publicKey === publicKey);
            setSelectedAccountSol(selected);
            handleGetSol(selected.publicKey);
        }
    };

    const toggleVisibility = () => {
        setIsVisible(prev => !prev);
    };
    const selectedAccount =
        network === 'ethereum' ? selectedAccountEth : selectedAccountSol;

    const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/UDv7PFX9VpQ_CgTYSw8V5RKXVuSTBv7E");
    const [balance, setBalance] = useState(0.0000);
    const handleGetEth = async (publicKey) => {
        setLoading(true);
        const balanceInWei = await provider.getBalance(publicKey)
        setBalance(ethers.formatEther(balanceInWei));
        console.log(ethers.formatEther(balanceInWei));
        setLoading(false);
    }
    const [sol, setSol] = useState(0.0000);
    const handleGetSol = async (selectedPublicKey) => {
        try {
            setLoading(true);
            const connection = new Connection('https://solana-devnet.g.alchemy.com/v2/UDv7PFX9VpQ_CgTYSw8V5RKXVuSTBv7E', "confirmed");
            const publicKey = new PublicKey(selectedPublicKey);
            const balanceInLamports = await connection.getBalance(publicKey);
            const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
            setSol(balanceInSOL);
            setLoading(false);
        } catch (error) {
            setLoading(false);
            console.error("Error fetching balance:", error);
        }
    }

    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');

    const handleSendEth = async () => {
        console.log(recipient, amount);
        if (!ethers.isAddress(recipient)) {
            console.error('Invalid Ethereum address');
            return; // Handle invalid Ethereum address
        }

        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            console.error('Invalid amount');
            return; // Handle invalid amount
        }

        try {
            setSentLoading(true);
            const wallet = new ethers.Wallet(selectedAccount.privateKey, provider);
            const tx = {
                to: recipient,
                value: ethers.parseEther(amount),
                gasLimit: 21000,
                gasPrice: ((await provider.getFeeData()).gasPrice),
            };
            console.log(tx);
            const transaction = await wallet.sendTransaction(tx);
            console.log(transaction.hash);
            handleGetEth();
            toast.success('Amount Sent Successfully!')
            setOpen((prev) => !prev);
            setSentLoading(false);
        } catch (error) {
            setSentLoading(false);
            console.error("Error sending ETH:", error);
        }
    };

    const handleSendSol = async () => {
        if (!recipient || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            console.error('Invalid recipient or amount');
            return; // Handle invalid amount or recipient
        }

        try {
            setSentLoading(true); // Show loader
            // Connect to Solana network
            const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
            // Convert sender private key to Keypair
            const senderSecretKey = Uint8Array.from(bs58.decode(selectedAccount.privateKey));
            const sender = Keypair.fromSecretKey(senderSecretKey);
            // Convert receiver's public key to PublicKey
            const receiverPublicKey = new PublicKey(recipient);
            const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: sender.publicKey,
                    toPubkey: receiverPublicKey,
                    lamports,
                })
            );
            console.log(connection);
            const signature = await sendAndConfirmTransaction(connection, transaction, [sender]);
            console.log("Transaction successful! Signature:", signature);
            handleGetSol(); // Assume this function updates the SOL balance
            setOpen((prev) => !prev);
            toast.success('Amount Sent Successfully!')
            setSentLoading(false); // Hide loader
        } catch (error) {
            setSentLoading(false); // Hide loader
            console.error("Error sending SOL with Alchemy:", error);
            toast.error('Error sending SOL.');
        }
    };
    const handleSubmit = (event) => {
        event.preventDefault();

        if (network === 'ethereum') {
            handleSendEth();
        } else {
            handleSendSol();
        }
    };

    useEffect(() => {
        const storedMnemonic = JSON.parse(localStorage.getItem('mnemonic') || '[]');
        const storedSeed = localStorage.getItem('seed');
        const storedSolanaKeypairs = JSON.parse(localStorage.getItem('solanaKeypair') || '[]');
        const storedEthereumKeypairs = JSON.parse(localStorage.getItem('ethereumKeypair') || '[]');

        if (storedMnemonic.length > 0) setMnemonic(storedMnemonic);
        if (storedSeed) setSeed(Buffer.from(storedSeed, 'hex'));
        if (storedSolanaKeypairs.length > 0) setSolanaKeypair(storedSolanaKeypairs);
        if (storedEthereumKeypairs.length > 0) setEthereumKeypair(storedEthereumKeypairs);
    }, []);

    return (

        <div className='mx-auto px-80'>
            <Header darkMode={darkMode} setDarkMode={setDarkMode} />
            <hr className="mx-5 border-gray-300 dark:border-gray-800" />
            <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-slate-200 text-black'} p-8 font-poppins h-screen`}>
                <div className='flex justify-center'>
                    <Button onClick={handleGenerateMnemonic}>Generate Seed Phrase</Button>
                </div>
                <Accordion type='single' collapsible>
                    <AccordionItem value="item-1">
                        <AccordionTrigger> Reveal My Seed Phrase. Please Don't Share It with Anyone</AccordionTrigger>
                        {mnemonic.length > 0 && (
                                <div onClick={() => navigator.clipboard.writeText(selectedAccount.privateKey).then(() => {
                                    toast.success('Seed Phrase copied!')
                                })}>
                            <AccordionContent className='grid grid-cols-4 gap-6 border-2 border-gray-600 border-dashed rounded-xl p-5' >

                                {mnemonic.map((item, index) => (
                                    <Button variant="secondary" key={index} className='text-xl py-5'>{item}</Button>
                                ))}
                                <p className='text-center col-span-4 text-gray-400'>Click Anywhere to copy</p>
                            </AccordionContent>
                                </div>
                        )}
                    </AccordionItem>
                </Accordion>

                <div className='flex justify-around items-center'>
                    <Select value={network} onValueChange={setNetwork}>
                        <SelectTrigger className="w-[200px] mt-7 py-5">
                            <SelectValue placeholder="Select Your Network" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup className=' font-poppins '>
                                <SelectItem value="ethereum">
                                    <div className=' flex gap-3 items-center text-base'>
                                        <img src="/eth.png" alt="" width={30} height={30} />
                                        Ethereum
                                    </div>
                                </SelectItem>
                                <SelectItem value="solana">
                                    <div className=' flex gap-3 items-center text-base'>
                                        <img src="/sol.png" alt="" width={30} height={30} />Solana
                                    </div>
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Select
                        value={selectedAccount?.publicKey ?? ''}
                        onValueChange={handleAccountSelect}
                    >
                        <SelectTrigger className="w-[600px] mt-7 py-8">
                            <SelectValue placeholder="Select an Account" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup className=' font-poppins'>
                                {network === 'ethereum' && ethereumKeypair.map((keys, index) => (
                                    <SelectItem key={index} value={keys.publicKey}>
                                        <div className="flex gap-3 items-center">
                                            <svg x="0" y="0" width="32" height="32" className="rounded-full">
                                                <rect x="0" y="0" width="32" height="32" fill="#1868F2"></rect>
                                            </svg>
                                            <p className="text-lg">Account {index + 1}</p>
                                        </div>
                                        <p className="text-gray-400 pl-10">Address: {keys.publicKey}</p>
                                    </SelectItem>
                                ))}
                                {network === 'solana' && solanaKeypair.map((keys, index) => (
                                    <SelectItem key={index} value={keys?.publicKey}>
                                        <div className="flex gap-3 items-center">
                                            <svg x="0" y="0" width="32" height="32" className="rounded-full">
                                                <rect x="0" y="0" width="32" height="32" fill="#F2D602"></rect>
                                            </svg>
                                            <p className="text-lg">Account {index + 1}</p>
                                        </div>
                                        <p className="text-gray-400 pl-10">Address: {keys.publicKey}</p>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>

                    <Button className='mt-10' onClick={generateKeyPair}>Add {network.toUpperCase()} Wallet</Button>
                </div>
                <div className="text-center py-10">
                    {selectedAccount && (
                        <div>
                            <div className='flex justify-center items-center gap-3'>
                                <Accordion type='single' collapsible>
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Private Key (Please Don't Share It with Anyone)</AccordionTrigger>
                                        <AccordionContent className='border-[1px] border-gray-600 border-dashed rounded-xl p-2'>
                                            <div className='flex justify-center gap-2'>
                                                <p className=' text-gray-400 text-lg'>{
                                                    isVisible ? selectedAccount?.privateKey : <span className='text-2xl'>{"•".repeat(selectedAccount.privateKey.length)}</span>
                                                }</p>
                                                {isVisible ?
                                                    <div>
                                                        <VisibilityOffIcon onClick={toggleVisibility} style={{ cursor: 'pointer' }} />
                                                        <ContentCopyIcon onClick={() => navigator.clipboard.writeText(selectedAccount.privateKey).then(() => {
                                                            toast.success('Private key copied!')
                                                        })} className='mx-4' />
                                                    </div> : <VisibilityIcon onClick={toggleVisibility} style={{ cursor: 'pointer' }} />}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>

                            </div>
                            <div className='flex justify-center items-center mt-5'>

                                <p className='text-gray-300'>Public Key (Address)  : {selectedAccount.publicKey} </p>
                                <ContentCopyIcon
                                    onClick={() =>
                                        navigator.clipboard.writeText(selectedAccount.publicKey)
                                            .then(() => toast.success('Public key copied!'))
                                    }
                                    className="mx-4"
                                />
                            </div>

                        </div>
                    )}
                </div>

                {selectedAccount && (
                    <>
                        {
                            network === 'ethereum' ?
                                <p className='text-center text-3xl py-4 font-bold flex justify-center items-center gap-5'>{loading && <CircularProgress size={40} color='inherit' />}{parseFloat(balance)} SepoliaETH</p> :
                                <p className='text-center text-3xl py-4 font-bold flex justify-center items-center gap-5'>{loading && <CircularProgress size={40} color='inherit' />}{sol} Sol</p>
                        }
                        <div className='flex gap-14 justify-center my-6'>
                            <Button className='text-lg bg-blue-600 px-10' onClick={() => setOpen((prev) => !prev)}><SendIcon />Send</Button>
                            <a href={network === 'ethereum' ? "https://cloud.google.com/application/web3/faucet/ethereum" : 'https://faucet.solana.com/'} target='blank'><Button className='text-lg bg-blue-600 px-10' ><AssuredWorkloadIcon />Fauset</Button></a>
                        </div>
                        {open && (
                            <div className='mx-96'>
                                <form action="" onSubmit={handleSubmit}>
                                    <Label htmlFor="from" className=' text-lg'>To</Label>
                                    <Input type="recipient" id="recipient" placeholder="Recipient Address" className=' py-6 font-poppins text-4xl' onChange={(e) => setRecipient(e.target.value)} />
                                    {/* <p className='py-2 text-sm'><span className=' text-blue-600'>En : </span> {network === 'ethereum' ? parseFloat(balance) : {sol}}</p> */}
                                    <Input type="recipient" id="recipient" placeholder="Amount" className=' my-5 py-6 font-poppins text-4xl' onChange={(e) => setAmount(e.target.value)} />
                                    <div className=' flex justify-between items-center gap-6'>
                                        <Button type="submit" className='my-3 text-lg w-full'disabled={sentLoading}> {sentLoading ? 'Sending....' : 'Send'}</Button>
                                        <Button className='w-full text-lg bg-red-900 dark:text-white hover:bg-red-700' onClick={() => setOpen((prev) => !prev)}>Cancel</Button>
                                    </div>
                                </form>
                            </div>
                        )}
                        <Toaster position="top-right" />
                    </>
                )}
            </div>
            <p className='my-7 font-poppins text-lg text-center'>Designed and Developed By Karan</p>
        </div>
    );
}

export default Mainpage;
