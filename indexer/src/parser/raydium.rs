//! Raydium AMM parser.

use crate::parser::{ParsedEvent, Parser, SwapEvent, RAYDIUM_AMM_PROGRAM_ID};
use crate::receiver::TransactionUpdate;

pub struct RaydiumParser;

impl RaydiumParser {
    pub fn new() -> Self {
        Self
    }
}

// Raydium AMM swap instruction discriminant
const IX_SWAP_BASE_IN: u8 = 9;
const IX_SWAP_BASE_OUT: u8 = 11;

impl Parser for RaydiumParser {
    fn program_id(&self) -> &str {
        RAYDIUM_AMM_PROGRAM_ID
    }

    fn parse(&self, tx: &TransactionUpdate) -> Vec<ParsedEvent> {
        let mut events = Vec::new();

        for ix in &tx.instructions {
            if ix.program_id != RAYDIUM_AMM_PROGRAM_ID {
                continue;
            }
            if ix.data.is_empty() {
                continue;
            }
            match ix.data[0] {
                IX_SWAP_BASE_IN | IX_SWAP_BASE_OUT => {
                    // accounts: [amm, ...token_vaults..., user_source, user_dest, user_owner]
                    events.push(ParsedEvent::Swap(SwapEvent {
                        signature: tx.signature.clone(),
                        block_time: tx.block_time,
                        program: RAYDIUM_AMM_PROGRAM_ID.into(),
                        input_mint: ix.accounts.get(14).cloned().unwrap_or_default(),
                        output_mint: ix.accounts.get(15).cloned().unwrap_or_default(),
                        input_amount: if ix.data.len() >= 9 {
                            u64::from_le_bytes(ix.data[1..9].try_into().unwrap_or_default())
                        } else {
                            0
                        },
                        output_amount: 0,
                        user: ix.accounts.last().cloned().unwrap_or_default(),
                    }));
                }
                _ => {}
            }
        }

        events
    }
}
