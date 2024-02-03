# EXITSCAM TICKET AUTO-BUY SCRIPT

## Environment variables

```
BACKEND_RPC =
SCRIPT_KEYPAIR =

SCRIPT_KEYPAIR -> Wallet containing SOL for buyback
BACKEND_RPC -> RPC used for the buyback script (we recommend using a custom rpc from quicknode / helius)
```

## How to run

1. Fork this repo
2. Head over to https://render.com/ & create an account
3. Connect github
4. On render dashboard -> Select new -> Web Services -> Select the github repo -> Give a name for your service -> Under start command enter **ts-node index.ts** -> Fill in the environment variables

```
example

NAME_OF_VARIABLE 
BACKEND_RPC          https://api.mainnet-beta.solana.com
SCRIPT_KEYPAIR       [12,12,13,3,24,352,53,3,6356,67,45,7,75,867,8,67]
```
5. Deploy
   


