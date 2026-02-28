//! Parser engine — pluggable instruction-level parsing.

pub mod jupiter;
pub mod nft;
pub mod raydium;
pub mod spl_token;

use crate::receiver::{AccountUpdate, BlockUpdate, TransactionUpdate};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Well-known program IDs
pub const SPL_TOKEN_PROGRAM_ID: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
pub const SPL_TOKEN_2022_PROGRAM_ID: &str = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
pub const METAPLEX_PROGRAM_ID: &str = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
pub const JUPITER_PROGRAM_ID: &str = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
pub const RAYDIUM_AMM_PROGRAM_ID: &str = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

/// A parsed, normalised event ready for the writer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParsedEvent {
    Transaction(TransactionEvent),
    TokenTransfer(TokenTransferEvent),
    NftMint(NftMintEvent),
    NftTransfer(NftTransferEvent),
    Swap(SwapEvent),
    AccountUpdate(AccountUpdate),
    Block(BlockUpdate),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionEvent {
    pub signature: String,
    pub slot: u64,
    pub block_time: i64,
    pub success: bool,
    pub fee: u64,
    pub compute_units: u64,
    pub accounts: Vec<String>,
    pub log_messages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenTransferEvent {
    pub signature: String,
    pub block_time: i64,
    pub mint: String,
    pub source: String,
    pub destination: String,
    pub amount: u64,
    pub decimals: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftMintEvent {
    pub signature: String,
    pub block_time: i64,
    pub mint: String,
    pub owner: String,
    pub metadata_uri: Option<String>,
    pub collection: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NftTransferEvent {
    pub signature: String,
    pub block_time: i64,
    pub mint: String,
    pub from: String,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapEvent {
    pub signature: String,
    pub block_time: i64,
    pub program: String,
    pub input_mint: String,
    pub output_mint: String,
    pub input_amount: u64,
    pub output_amount: u64,
    pub user: String,
}

/// Pluggable parser interface.
pub trait Parser: Send + Sync {
    fn program_id(&self) -> &str;
    fn parse(&self, tx: &TransactionUpdate) -> Vec<ParsedEvent>;
}

/// Holds all registered parsers and routes transactions to the correct one.
pub struct ParserEngine {
    parsers: HashMap<String, Box<dyn Parser>>,
}

impl ParserEngine {
    pub fn new() -> Self {
        Self {
            parsers: HashMap::new(),
        }
    }

    pub fn register(&mut self, parser: Box<dyn Parser>) {
        self.parsers.insert(parser.program_id().to_string(), parser);
    }

    /// Parse all instructions in a transaction and collect events.
    pub fn parse(&self, tx: &TransactionUpdate) -> Vec<ParsedEvent> {
        let mut events = Vec::new();
        let programs_in_tx: std::collections::HashSet<&str> = tx
            .instructions
            .iter()
            .map(|i| i.program_id.as_str())
            .collect();

        for program_id in programs_in_tx {
            if let Some(parser) = self.parsers.get(program_id) {
                events.extend(parser.parse(tx));
            }
        }
        events
    }
}
