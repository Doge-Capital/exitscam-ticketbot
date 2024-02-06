import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import {
  buyTicketTransactions,
  getBuyTicketAccounts,
  getTotalTicketPrice,
  connection,
  programId,
  authority,
  VAULT_SEED_V2,
  GAME_SEED_V2,
} from "./helper";
import { PublicKey, Keypair } from "@solana/web3.js";
import { IDL } from "./IDL";
import { config } from "dotenv";
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/utf8";
config();

const devWallet = Uint8Array.from(JSON.parse(process.env.SCRIPT_KEYPAIR!));
const devWalletKey = Keypair.fromSecretKey(devWallet);

// let gameAccount = new PublicKey("2krNPf5tHiSYpSY6EwHYpVyxwAM5ovrYwuj4sTtUYWJg");

// let vaultAccount = new PublicKey(
//   "HUqbrRwSfgGS9VtUKTHgRs2Z9n5kWHHKKyGf8um3uhMR"
// );

const http = require('http');

// Create a server instance
const server = http.createServer((req:any, res:any) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, World!\n');
});

// Specify the port for the server to listen on
const port = 3001; // Use the port specified in the environment variable PORT, or default to port 3000

// Start the server and listen for incoming connections
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const main = async () => {
  while (true) {
    try {
      const provider = new AnchorProvider(
        connection,
        new Wallet(devWalletKey),
        { commitment: "processed" }
      );
      const program = new Program(IDL, programId, provider);

      let [vaultAccount] = PublicKey.findProgramAddressSync(
        [encode(VAULT_SEED_V2), authority.toBuffer()],
        program.programId,
      );

      let vaultInfo = await program.account.vaultAccountV2.fetch(
        vaultAccount,
        "recent"
      );

      console.log("restarting");

      let currGameId = vaultInfo.currGameId;

      const walletId = devWalletKey.publicKey;

      const buyTicketAccounts = await getBuyTicketAccounts(
        currGameId,
        walletId,
        program,
        null
      );

      let gameAccount;

      if (currGameId !== null) {
        const buffer = Buffer.allocUnsafe(2);
        buffer.writeUInt16LE(currGameId, 0);

        [gameAccount] = PublicKey.findProgramAddressSync(
          [encode(GAME_SEED_V2), authority.toBuffer(), buffer],
          program.programId,
        );
      } else if (!gameAccount) return null;

      let gameInfo = await program.account.gameAccountV2.fetchNullable(
        gameAccount,
        "recent"
      );

      // let ticketNum = 0;

      // let ticketStartNum =
      //   gameInfo!.totalTickets.toNumber() -
      //   gameInfo!.constTickets.toNumber() +
      //   1;

      // let i = 0;
      // let flag = true;

      // while (flag) {
      //   if (getTotalTicketPrice(ticketStartNum, i) > 0.5) {
      //     ticketNum = i;
      //     flag = false;
      //   }
      //   ++i;
      // }

      let timeLeft = gameInfo!.endTime.toNumber() - Date.now() / 1000;

      console.log("timeLeft", timeLeft, "tickets bought",gameInfo!.totalTickets.toNumber(),"lastKey",gameInfo!.lastBuyer?.toBase58());

      if (timeLeft < 15 && timeLeft > 0 && gameInfo!.totalTickets.toNumber() > 30000 && gameInfo!.lastBuyer?.toBase58()!=walletId.toBase58()) {
        const { transactions, blockhash } = await buyTicketTransactions(
          walletId,
          "dragon",
          1,
          buyTicketAccounts,
          program
        );

        transactions[0].partialSign(devWalletKey);
        let txSig = await connection.sendRawTransaction(
          transactions[0].serialize(),
          {
            skipPreflight: true,
          }
        );

        console.log("executing buy", txSig);
      }
      await new Promise((r) => setTimeout(r, 5000));
    } catch (e) {
      console.log(e);
    }
  }
};

main();
