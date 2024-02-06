import { Program, utils, BN } from "@coral-xyz/anchor";
import { Fomo3d } from "./IDL";
import {
  ComputeBudgetProgram,
  SystemProgram,
  Transaction,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import { config } from "dotenv";
config();

let { encode } = utils.bytes.utf8;

export const RANDOM_NUM_SEED = "random_num_account001";
export const VAULT_SEED_V2 = "vault_account000_v2";
export const GAME_SEED_V2 = "game_account000_v2";
export const USER_SEED_V2 = "user_account000_v2";

export const connection = new Connection(process.env.BACKEND_RPC!, "processed");

export const programId = new PublicKey(
  "FoMotN3mJB5QVorWrgF7gHRoguUYRr2dApDondesrYe"
);
export const memoProgramId = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export const internalAccount = new PublicKey(
  "HzDupNJ2kxaz2WooMnFYASg72fg19mnbk454vrVXKFEJ"
);
export const teamAccount = new PublicKey(
  "DATPpctkBQ8x4WdHczeZ5R8MGSxSJq94fhcSwTm4EHzB"
);
export const fomoTokenMint = new PublicKey(
  "Cx9oLynYgC3RrgXzin7U417hNY9D6YB1eMGw4ZMbWJgw"
);
export const authority = new PublicKey(
  "H7a7ukVSEdGr56mkkXDjQhH1gZjcvMqEeVfSxk2dLdUK"
);

export const randomNumAuthority = new PublicKey(
  "Fs4BW8hPndkRYohAQAKJoJDc2hNcG65YAarU2baSXjqX"
);

export const maxTicketsPerTxn = 650;

export const getTotalTicketPrice = (
  ticketStartNum: number,
  quantity: number
) => {
  let totalPrice = 0;

  for (let i = ticketStartNum; i < ticketStartNum + quantity; ++i) {
    totalPrice += 1e6 + 1e3 * i + 100 * Math.pow(1.01, Math.max(0, i - 1e4));
  }

  return totalPrice / 1e9;
};

export const getBuyTicketAccounts = async (
  currGameId: number,
  buyer: PublicKey,
  program: Program<Fomo3d>,
  referrer: PublicKey | null
) => {
  let [vaultAccount] = PublicKey.findProgramAddressSync(
    [encode(VAULT_SEED_V2), authority.toBuffer()],
    program.programId
  );

  const buffer1 = Buffer.allocUnsafe(2);
  buffer1.writeUInt16LE(currGameId, 0);

  let [prevGameAccount] = PublicKey.findProgramAddressSync(
    [encode(GAME_SEED_V2), authority.toBuffer(), buffer1],
    program.programId
  );

  let gameAccount;
  const gameInfo = await program.account.gameAccountV2.fetchNullable(
    prevGameAccount
  );

  if (gameInfo && gameInfo?.endTime.toNumber() < Date.now() / 1000) {
    const buffer2 = Buffer.allocUnsafe(2);
    buffer2.writeUInt16LE(++currGameId, 0);

    [gameAccount] = PublicKey.findProgramAddressSync(
      [encode(GAME_SEED_V2), authority.toBuffer(), buffer2],
      program.programId
    );
  } else {
    const buffer2 = Buffer.allocUnsafe(2);
    buffer2.writeUInt16LE(currGameId - 1, 0);

    gameAccount = prevGameAccount;
    [prevGameAccount] = PublicKey.findProgramAddressSync(
      [encode(GAME_SEED_V2), authority.toBuffer(), buffer2],
      program.programId
    );
  }

  let [userAccount] = PublicKey.findProgramAddressSync(
    [encode(USER_SEED_V2), buyer.toBuffer()],
    program.programId
  );

  let [randomNumAccount] = PublicKey.findProgramAddressSync(
    [encode(RANDOM_NUM_SEED), randomNumAuthority.toBuffer()],
    program.programId
  );

  const userInfo = await program.account.userAccountV2.fetchNullable(
    userAccount
  );

  if (userInfo?.isReferralCodeUsed) {
    referrer = userInfo.referrerAuthority;
  }

  let referrerAccount: PublicKey | null = null;
  if (referrer) {
    [referrerAccount] = PublicKey.findProgramAddressSync(
      [encode(USER_SEED_V2), referrer.toBuffer()],
      program.programId
    );
  }

  return {
    vaultAccount,
    prevGameAccount,
    gameAccount,
    userAccount,
    randomNumAccount,
    referrerAccount,
    currGameId,
  };
};

export const buyTicketTransactions = async (
  buyer: PublicKey,
  team: "dragon" | "bull" | "whale" | "bear",
  numOfTickets: number,
  buyTicketAccounts: {
    vaultAccount: PublicKey;
    prevGameAccount: PublicKey;
    gameAccount: PublicKey;
    userAccount: PublicKey;
    randomNumAccount: PublicKey;
    referrerAccount: PublicKey | null;
  },
  program: Program<Fomo3d>
) => {
  const {
    vaultAccount,
    prevGameAccount,
    gameAccount,
    userAccount,
    randomNumAccount,
    referrerAccount,
  } = buyTicketAccounts;

  const userInfo = await program.account.userAccountV2.fetchNullable(
    userAccount
  );
  const gameInfo = await program.account.gameAccountV2.fetchNullable(
    gameAccount
  );

  const transactions: Transaction[] = [];
  const blockhashContext = await connection.getLatestBlockhash("processed");

  const blockhash = blockhashContext.blockhash;
  const lastValidBlockHeight = blockhashContext.lastValidBlockHeight;

  for (let i = 0, j = 0; i < numOfTickets; ++j) {
    let transaction = new Transaction();
    transaction.feePayer = buyer;

    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    if (
      i !== 0 ||
      (userInfo && !userInfo.currGame.equals(SystemProgram.programId))
    )
      transaction.add(
        await program.methods
          .settleReward()
          .accounts({
            settler: buyer,
            userAccount,
            gameAccount:
              userInfo && !userInfo.currGame.equals(SystemProgram.programId)
                ? userInfo.currGame
                : gameInfo
                ? gameAccount
                : prevGameAccount,
          })
          .instruction()
      );

    const quantity = Math.min(maxTicketsPerTxn + j, numOfTickets - i);

    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200_000 }),
      await program.methods
        .buyTicket(team, new BN(quantity))
        .accounts({
          gameAccount,
          prevGameAccount,
          userAccount,
          buyer,
          internalAccount,
          teamAccount,
          vaultAccount,
          randomNumAccount,
          referrerAccount,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );

    transactions.push(transaction);
    i += quantity;
  }

  return { transactions, blockhash, lastValidBlockHeight };
};
