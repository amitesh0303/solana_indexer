//! SPL Token transfer parser.
//!
//! Decodes transfer, transferChecked, mint, and burn instructions from the
//! SPL Token and Token-2022 programs.

use crate::parser::{
    ParsedEvent, Parser, TokenTransferEvent, SPL_TOKEN_2022_PROGRAM_ID, SPL_TOKEN_PROGRAM_ID,
};
use crate::receiver::TransactionUpdate;

pub struct SplTokenParser;

impl SplTokenParser {
    pub fn new() -> Self {
        Self
    }
}

// Instruction discriminants for the SPL Token program
const IX_TRANSFER: u8 = 3;
const IX_TRANSFER_CHECKED: u8 = 12;

impl Parser for SplTokenParser {
    fn program_id(&self) -> &str {
        SPL_TOKEN_PROGRAM_ID
    }

    fn parse(&self, tx: &TransactionUpdate) -> Vec<ParsedEvent> {
        let mut events = Vec::new();

        for ix in &tx.instructions {
            if ix.program_id != SPL_TOKEN_PROGRAM_ID
                && ix.program_id != SPL_TOKEN_2022_PROGRAM_ID
            {
                continue;
            }
            if ix.data.is_empty() {
                continue;
            }

            let discriminant = ix.data[0];
            match discriminant {
                IX_TRANSFER => {
                    if ix.data.len() < 9 || ix.accounts.len() < 3 {
                        continue;
                    }
                    let amount = u64::from_le_bytes(ix.data[1..9].try_into().unwrap_or_default());
                    events.push(ParsedEvent::TokenTransfer(TokenTransferEvent {
                        signature: tx.signature.clone(),
                        block_time: tx.block_time,
                        mint: ix.accounts.get(2).cloned().unwrap_or_default(),
                        source: ix.accounts.first().cloned().unwrap_or_default(),
                        destination: ix.accounts.get(1).cloned().unwrap_or_default(),
                        amount,
                        decimals: 0, // decimals not in Transfer, only in TransferChecked
                    }));
                }
                IX_TRANSFER_CHECKED => {
                    // transferChecked: [source, mint, destination, authority, ...]
                    // data: [discriminant(1), amount(8), decimals(1)]
                    if ix.data.len() < 10 || ix.accounts.len() < 3 {
                        continue;
                    }
                    let amount = u64::from_le_bytes(ix.data[1..9].try_into().unwrap_or_default());
                    let decimals = ix.data[9];
                    events.push(ParsedEvent::TokenTransfer(TokenTransferEvent {
                        signature: tx.signature.clone(),
                        block_time: tx.block_time,
                        mint: ix.accounts.get(1).cloned().unwrap_or_default(),
                        source: ix.accounts.first().cloned().unwrap_or_default(),
                        destination: ix.accounts.get(2).cloned().unwrap_or_default(),
                        amount,
                        decimals,
                    }));
                }
                _ => {}
            }
        }

        events
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::receiver::RawInstruction;

    fn make_tx(instructions: Vec<RawInstruction>) -> TransactionUpdate {
        TransactionUpdate {
            signature: "testsig".into(),
            slot: 1,
            block_time: 1_700_000_000,
            success: true,
            fee: 5000,
            compute_units: 200_000,
            accounts: vec![],
            log_messages: vec![],
            instructions,
        }
    }

    #[test]
    fn test_transfer_checked_parsed() {
        let parser = SplTokenParser::new();
        let amount: u64 = 1_000_000;
        let mut data = vec![IX_TRANSFER_CHECKED];
        data.extend_from_slice(&amount.to_le_bytes());
        data.push(6); // decimals

        let tx = make_tx(vec![RawInstruction {
            program_id: SPL_TOKEN_PROGRAM_ID.into(),
            instruction_index: 0,
            inner_index: None,
            data,
            accounts: vec!["src".into(), "mint".into(), "dst".into(), "auth".into()],
        }]);

        let events = parser.parse(&tx);
        assert_eq!(events.len(), 1);
        if let ParsedEvent::TokenTransfer(e) = &events[0] {
            assert_eq!(e.amount, 1_000_000);
            assert_eq!(e.decimals, 6);
            assert_eq!(e.mint, "mint");
        } else {
            panic!("Expected TokenTransfer");
        }
    }
}
