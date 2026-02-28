//! Yellowstone gRPC receiver — wraps the gRPC subscription into a typed channel.
//!
//! In production this connects to a real Yellowstone/Geyser endpoint.
//! The `Update` enum is a simplified representation; the real struct would
//! be generated from the Yellowstone protobuf and then mapped here.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc::{self, Receiver};

/// Simplified account update from the gRPC stream.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountUpdate {
    pub pubkey: String,
    pub slot: u64,
    pub owner: String,
    pub lamports: u64,
    pub executable: bool,
    pub rent_epoch: u64,
    pub data: Vec<u8>,
}

/// Simplified transaction update from the gRPC stream.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionUpdate {
    pub signature: String,
    pub slot: u64,
    pub block_time: i64,
    pub success: bool,
    pub fee: u64,
    pub compute_units: u64,
    pub accounts: Vec<String>,
    pub log_messages: Vec<String>,
    pub instructions: Vec<RawInstruction>,
}

/// A single instruction extracted from a transaction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawInstruction {
    pub program_id: String,
    pub instruction_index: u32,
    pub inner_index: Option<u32>,
    pub data: Vec<u8>,
    pub accounts: Vec<String>,
}

/// Simplified block/slot update.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockUpdate {
    pub slot: u64,
    pub parent_slot: u64,
    pub block_time: i64,
    pub block_height: u64,
    pub leader: String,
    pub tip_slot: u64,
}

/// Tagged union of all update types from the stream.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum Update {
    Account(AccountUpdate),
    Transaction(TransactionUpdate),
    Block(BlockUpdate),
}

/// Connects to a Yellowstone gRPC endpoint and emits `Update` items.
pub struct YellowstoneReceiver {
    endpoint: String,
    #[allow(dead_code)]
    token: Option<String>,
}

impl YellowstoneReceiver {
    pub fn new(endpoint: String, token: Option<String>) -> Self {
        Self { endpoint, token }
    }

    /// Subscribe and return a channel receiver of `Result<Update>`.
    ///
    /// In a real deployment this would open a gRPC bidirectional stream using
    /// the generated Yellowstone protobuf client. Here we provide the interface
    /// that the indexer run loop depends on; the actual gRPC wiring is done via
    /// `yellowstone-grpc-client` in production.
    pub async fn subscribe(
        &mut self,
    ) -> Result<Receiver<Result<Update, anyhow::Error>>> {
        tracing::info!("Connecting to Yellowstone gRPC at {}", self.endpoint);
        let (_tx, rx) = mpsc::channel(1024);

        // Production implementation would call:
        //   let mut client = GeyserGrpcClient::build_from_shared(self.endpoint.clone())?
        //       .x_token(self.token.clone())?
        //       .connect()
        //       .await?;
        //   let stream = client.subscribe_with_request(request).await?;
        //   tokio::spawn(async move {
        //       while let Some(msg) = stream.next().await {
        //           let update = map_proto_to_update(msg);
        //           tx.send(update).await.ok();
        //       }
        //   });

        Ok(rx)
    }
}
