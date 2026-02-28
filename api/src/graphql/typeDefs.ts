import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # ─── Relay-style connection types ────────────────────────────────────────────

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # ─── Core domain types ───────────────────────────────────────────────────────

  type Transaction {
    signature: String!
    slot: Int!
    blockTime: DateTime
    success: Boolean!
    fee: Int!
    computeUnits: Int!
    accounts: [String!]!
    logMessages: [String!]!
    instructions: [Instruction!]!
    tokenTransfers: [TokenTransfer!]!
  }

  type TransactionEdge {
    cursor: String!
    node: Transaction!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  type Instruction {
    id: ID!
    programId: String!
    instructionIndex: Int!
    innerIndex: Int
    accounts: [String!]!
    parsed: JSON
  }

  type TokenTransfer {
    id: ID!
    signature: String!
    blockTime: DateTime!
    mint: String!
    source: String!
    destination: String!
    amount: String!
    decimals: Int!
  }

  type TokenTransferEdge {
    cursor: String!
    node: TokenTransfer!
  }

  type TokenTransferConnection {
    edges: [TokenTransferEdge!]!
    pageInfo: PageInfo!
    totalCount: Int
  }

  type Account {
    pubkey: String!
    owner: String
    lamports: String
    executable: Boolean
    rentEpoch: String
    slot: Int
  }

  type AccountSnapshot {
    pubkey: String!
    slot: Int!
    owner: String!
    lamports: String!
    executable: Boolean!
    rentEpoch: String!
  }

  type AccountUpdate {
    pubkey: String!
    slot: Int!
    owner: String!
    lamports: String!
    executable: Boolean!
    rentEpoch: String!
  }

  # ─── Root types ──────────────────────────────────────────────────────────────

  type Query {
    transaction(signature: String!): Transaction
    transactions(
      account: String
      program: String
      before: String
      after: String
      first: Int
      last: Int
    ): TransactionConnection!

    tokenTransfers(
      account: String!
      mint: String
      first: Int
      after: String
    ): TokenTransferConnection!

    account(pubkey: String!): Account
    accountHistory(pubkey: String!, startSlot: Int, endSlot: Int): [AccountSnapshot!]!
  }

  type Subscription {
    transactionAdded(account: String, program: String): Transaction!
    tokenTransfer(account: String, mint: String): TokenTransfer!
    accountChanged(pubkey: String!): AccountUpdate!
  }
`;
