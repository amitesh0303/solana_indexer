//! Jupiter swap parser.

use crate::parser::{ParsedEvent, Parser, SwapEvent, JUPITER_PROGRAM_ID};
use crate::receiver::TransactionUpdate;

pub struct JupiterParser;

impl JupiterParser {
    pub fn new() -> Self {
        Self
    }
}

// Jupiter v6 route instruction discriminator (first 8 bytes of sha256("global:route"))
const ROUTE_DISCRIMINATOR: [u8; 8] = [0xe5, 0x17, 0xcb, 0x97, 0x7a, 0xe3, 0xad, 0x2a];

impl Parser for JupiterParser {
    fn program_id(&self) -> &str {
        JUPITER_PROGRAM_ID
    }

    fn parse(&self, tx: &TransactionUpdate) -> Vec<ParsedEvent> {
        let mut events = Vec::new();

        for ix in &tx.instructions {
            if ix.program_id != JUPITER_PROGRAM_ID {
                continue;
            }
            if ix.data.len() < 8 {
                continue;
            }
            if ix.data[..8] != ROUTE_DISCRIMINATOR {
                continue;
            }
            // Best-effort: accounts[0] = token_program, accounts[1] = user authority,
            // accounts[2] = user source token account, accounts[3] = user dest token account.
            // Full ABI decode would use Anchor IDL; this is a simplified version.
            events.push(ParsedEvent::Swap(SwapEvent {
                signature: tx.signature.clone(),
                block_time: tx.block_time,
                program: JUPITER_PROGRAM_ID.into(),
                input_mint: ix.accounts.get(2).cloned().unwrap_or_default(),
                output_mint: ix.accounts.get(3).cloned().unwrap_or_default(),
                input_amount: 0,  // would decode from ix.data
                output_amount: 0, // would decode from ix.data
                user: ix.accounts.get(1).cloned().unwrap_or_default(),
            }));
        }

        events
    }
}
