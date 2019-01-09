import { Button, Col, Divider, Radio, Row, Spin } from 'antd'
import React, { useCallback, useMemo, useState } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { Link } from 'react-router-dom'
import TopBanner from '../components/top-banner'
import styled from 'styled-components/macro'

const StyledRadioGroup = styled(Radio.Group)`
  float: right;
`
export default () => {
  const { useCacheCall, useCacheEvents } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const [filter, setFilter] = useState(true)
  const draws = useCacheEvents(
    'KlerosLiquid',
    'Draw',
    useMemo(
      () => ({
        filter: { _address: drizzleState.account },
        fromBlock: 0
      }),
      [drizzleState.account]
    )
  )
  const disputes = useCacheCall(['KlerosLiquid'], call =>
    draws
      ? draws.reduce(
          (acc, d) => {
            if (!acc.IDs[d.returnValues._disputeID]) {
              acc.IDs[d.returnValues._disputeID] = true
              const dispute = call(
                'KlerosLiquid',
                'disputes',
                d.returnValues._disputeID
              )
              if (dispute)
                acc[dispute.period === '4' ? 'executedIDs' : 'activeIDs'].push(
                  d.returnValues._disputeID
                )
              else acc.loading = true
            }
            return acc
          },
          { IDs: {}, activeIDs: [], executedIDs: [], loading: false }
        )
      : { activeIDs: [], executedIDs: [], loading: true }
  )
  return (
    <>
      <TopBanner
        description="Select a case you have been drawn in, study the evidence, and vote."
        extra={
          <Link to="/cases/history">
            <Button size="large" type="primary">
              Cases History
            </Button>
          </Link>
        }
        title="Cases"
      />
      My Cases
      <StyledRadioGroup
        buttonStyle="solid"
        name="filter"
        onChange={useCallback(e => setFilter(e.target.value), [])}
        value={filter}
      >
        <Radio.Button value>Active</Radio.Button>
        <Radio.Button value={false}>Executed</Radio.Button>
      </StyledRadioGroup>
      <Divider />
      <Spin spinning={disputes.loading}>
        <Row gutter={48}>
          {disputes[filter ? 'activeIDs' : 'executedIDs'].map(ID => (
            <Col key={ID} span={8}>
              {ID}
            </Col>
          ))}
        </Row>
      </Spin>
    </>
  )
}