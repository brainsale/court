import { Col, Modal, Row, Button, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import Web3 from "../bootstrap/web3";
import MerkleRedeem from "../../node_modules/@kleros/pnk-merkle-drop-contracts/deployments/mainnet/MerkleRedeem.json";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { ReactComponent as Kleros } from "../assets/images/kleros.svg";
import { ReactComponent as Spinner } from "../assets/images/spinner.svg";

import { ReactComponent as RightArrow } from "../assets/images/right-arrow.svg";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const ClaimModal = ({ visible, onOk, onCancel }) => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle();
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    web3: drizzleState.web3
  }));

  const [claims, setClaims] = useState(0);
  const [txHash, setTxHash] = useState(null);
  const [claimStatus, setClaimStatus] = useState(0);
  const [modalState, setModalState] = useState(0);

  const CONTRACT_ADDRESS = "0x8FEeEe5954E9eC05B79724C6829F9f5be0cC4ff0";

  const claimObjects = claims => {
    if (claims.length > 0) return claims.filter((claim, index) => claimStatus[index] == false && claim).map((claim, index) => ({ week: 1, balance: claim.value.hex, merkleProof: claim.proof }));
  };

  const snapshots = ["https://pnk-airdrop-snapshots.s3.us-east-2.amazonaws.com/snapshot-1.json"];

  useEffect(() => {
    console.log("useEffect triggered");
    var responses = [];
    for (var month = 0; month < 1; month++) {
      responses[month] = fetch(`https://ipfs.kleros.io/ipfs/QmQvTRLhHCouUK5q3PFSey28YAQoZbHWwATEVuWiwZBtFx`);
    }

    const results = Promise.all(responses.map(promise => promise.then(r => r.json()).catch(e => console.error(e))));
    setClaims(0);
    results.then(r =>
      r.forEach(function(item) {
        if (item)
          setClaims(prevState => {
            if (prevState) return [...prevState, item.merkleTree.claims[drizzleState.account]];
            else return [item.merkleTree.claims[drizzleState.account]];
          });
        else
          setClaims(prevState => {
            if (prevState) return [...prevState, 0];
            else return [0];
          });
      })
    );

    const contract = new Web3.eth.Contract(MerkleRedeem.abi, CONTRACT_ADDRESS);
    const claimStatus = contract.methods.claimStatus(drizzleState.account, 1, 12).call();

    //

    claimStatus.then(r => setClaimStatus(r));
  }, [drizzleState, modalState]);

  const delay = delayInMilliseconds => new Promise(resolve => setTimeout(resolve, delayInMilliseconds));

  const handleClaim = () => {
    setModalState(1);

    const tx = claimWeeks(claims);
    tx.on("transactionHash", function(hash) {
      setTxHash(hash);
    });

    tx.then(handleClaimed).catch(err => {
      setModalState(0);
    });
  };

  const handleClaimed = () => {
    setModalState(2);
  };

  const handleCancel = () => {
    setModalState(0);
    onCancel();
  };

  const getTotalClaimable = claims => {
    const unclaimedItems = claims.filter((claim, index) => claimStatus[index] == false).map(claim => drizzle.web3.utils.toBN(claim ? claim.value.hex : "0x0"));
    if (unclaimedItems.length > 0)
      return unclaimedItems.reduce(function(accumulator, currentValue, currentIndex, array) {
        return accumulator.add(currentValue);
      });
    else return "0";
  };
  const getTotalRewarded = claims =>
    claims
      .map(claim => drizzle.web3.utils.toBN(claim ? claim.value.hex : "0x0"))
      .reduce(function(accumulator, currentValue, currentIndex, array) {
        return accumulator.add(currentValue);
      });

  const claimWeeks = claims => {
    const contract = new Web3.eth.Contract(MerkleRedeem.abi, CONTRACT_ADDRESS);
    const args = claimObjects(claims);
    return contract.methods.claimWeeks(drizzleState.account, args).send({ from: drizzleState.account });
  };

  return (
    <Modal
      bodyStyle={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "black",
        padding: "56px"
      }}
      centered
      keyboard
      okText="Claim Your PNK Tokens"
      onOk={onOk}
      onCancel={handleCancel}
      visible={visible}
      width="800px"
      footer={null}
    >
      {false && claims && console.log(getTotalClaimable(claims).toString())}
      {false && claims && console.log(claims)}
      {false && claims && console.log(claimStatus)}

      {modalState == 1 && <Spin size="large" />}
      {(modalState == 0 || modalState == 2) && <Kleros style={{ maxWidth: "100px", maxHeight: "100px" }} />}
      {modalState >= 1 && <div style={{ fontSize: "24px", marginTop: "24px" }}>{modalState == 1 ? "Claiming" : "🎉 Claimed 🎉"}</div>}
      <div style={{ fontSize: "64px", fontWeight: "500", color: "#9013FE", marginBottom: "24px" }}> {claims.length > 0 && claimStatus.length > 0 && Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0)} PNK </div>
      {modalState == 0 && (
        <>
          <div style={{ fontSize: "24px", fontWeight: "400" }}>🎉 Thanks for being part of the community! 🎉</div>
          <div style={{ fontSize: "24px", fontWeight: "500", marginTop: "8px" }}>As a Kleros Juror, you will earn PNK for staking in Court.</div>

          <div
            style={{
              fontSize: "24px",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              boxShadow: "0px 2px 3px  rgba(0, 0, 0, 0.06)",
              borderRadius: "18px",
              padding: "24px 32px",
              width: "100%",
              marginTop: "24px",
              marginBottom: "24px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Total Rewarded PNK:</div>
              <div style={{ fontWeight: "500", textAlign: "right" }}>{claims && Number(drizzle.web3.utils.fromWei(getTotalRewarded(claims))).toFixed(0)} PNK</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Unclaimed:</div>
              <div style={{ color: "#9013FE", fontWeight: "500", textAlign: "right" }}>{claims && Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0)} PNK</div>
            </div>
          </div>
        </>
      )}
      {modalState >= 1 && <hr style={{ width: "100%", border: "1px solid rgba(0,0,0,0.1", marginBottom: "32px" }} />}
      {modalState == 2 && <div style={{ fontSize: "18px", fontWeight: "400" }}> Thank you for being part of the community! </div>}
      <div style={{ fontSize: "18px", color: "#009AFF" }}>
        {modalState == 0 && (
          <a href="kleros.io" target="_blank" rel="noopener noreferrer">
            Read more about Justice Farming <RightArrow style={{ marginLeft: "4px", verticalAlign: "middle" }} />
          </a>
        )}

        {modalState == 1 && txHash && (
          <a href={`https://${drizzleState.web3.networkId == 42 && "kovan."}etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
            View Transaction on Etherscan <RightArrow style={{ marginLeft: "4px", verticalAlign: "middle" }} />
          </a>
        )}

        {modalState == 2 && (
          <a href="kleros.io" target="_blank" rel="noopener noreferrer">
            Read more about the Juror Incentive Program <RightArrow style={{ marginLeft: "4px", verticalAlign: "middle" }} />
          </a>
        )}
      </div>
      {modalState == 0 && claims && (
        <Button
          onClick={handleClaim}
          size="large"
          type="primary"
          style={
            !claims || Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0) < 1
              ? { marginTop: "40px", border: "none", color: "#CCC", backgroundColor: "#fafafa" }
              : {
                  marginTop: "40px",
                  backgroundColor: "#9013FE",
                  color: "white",
                  border: "none"
                }
          }
          disabled={!claims || Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0) < 1}
        >
          Claim Your PNK Tokens
        </Button>
      )}
    </Modal>
  );
};

ClaimModal.propTypes = {};

export default ClaimModal;
