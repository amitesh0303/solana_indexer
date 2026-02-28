//! NFT mint and transfer parser (Metaplex Token Metadata).

use crate::parser::{
    NftMintEvent, NftTransferEvent, ParsedEvent, Parser, METAPLEX_PROGRAM_ID,
};
use crate::receiver::TransactionUpdate;

pub struct NftParser;

impl NftParser {
    pub fn new() -> Self {
        Self
    }
}

const IX_CREATE_METADATA: u8 = 0; // CreateMetadataAccount
const IX_MINT_NEW_EDITION: u8 = 11;

impl Parser for NftParser {
    fn program_id(&self) -> &str {
        METAPLEX_PROGRAM_ID
    }

    fn parse(&self, tx: &TransactionUpdate) -> Vec<ParsedEvent> {
        let mut events = Vec::new();

        for ix in &tx.instructions {
            if ix.program_id != METAPLEX_PROGRAM_ID {
                continue;
            }
            if ix.data.is_empty() {
                continue;
            }
            match ix.data[0] {
                IX_CREATE_METADATA => {
                    if ix.accounts.len() < 4 {
                        continue;
                    }
                    events.push(ParsedEvent::NftMint(NftMintEvent {
                        signature: tx.signature.clone(),
                        block_time: tx.block_time,
                        mint: ix.accounts.get(1).cloned().unwrap_or_default(),
                        owner: ix.accounts.get(3).cloned().unwrap_or_default(),
                        metadata_uri: None,
                        collection: None,
                    }));
                }
                IX_MINT_NEW_EDITION => {
                    // edition mint — treat as NFT transfer to new owner
                    if ix.accounts.len() < 2 {
                        continue;
                    }
                    events.push(ParsedEvent::NftTransfer(NftTransferEvent {
                        signature: tx.signature.clone(),
                        block_time: tx.block_time,
                        mint: ix.accounts.get(1).cloned().unwrap_or_default(),
                        from: String::new(),
                        to: ix.accounts.get(0).cloned().unwrap_or_default(),
                    }));
                }
                _ => {}
            }
        }

        events
    }
}
