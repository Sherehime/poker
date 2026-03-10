import { List, Tag, Statistic, Row, Col, Empty, Card } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { Vote, VoteValue } from '../types';

interface VotingResultsProps {
  votes: Vote[];
  showCards: boolean;
  finalEstimate?: VoteValue;
}

const VotingResults = ({ votes, showCards, finalEstimate }: VotingResultsProps) => {
  if (votes.length === 0) {
    return <Empty description="Пока нет голосов" />;
  }

  return (
    <div>
      {showCards && finalEstimate !== undefined && (
        <Card style={{ marginBottom: 16, textAlign: 'center', background: '#f0f5ff' }}>
          <Row gutter={16}>
            <Col span={24}>
              <Statistic
                title="Итоговая оценка"
                value={finalEstimate}
                valueStyle={{ fontSize: '48px', fontWeight: 'bold', color: '#1890ff' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}

      <List
        dataSource={votes}
        renderItem={(vote) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <div
                  style={{
                    width: '60px',
                    height: '80px',
                    borderRadius: '8px',
                    background: showCards ? '#1890ff' : '#d9d9d9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: showCards ? '#fff' : '#8c8c8c',
                  }}
                >
                  {showCards ? vote.value : '?'}
                </div>
              }
              title={
                <span>
                  {vote.userName}
                  {!vote.userName?.endsWith('(Owner)') && vote.userName !== 'Owner' && (
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      Участник
                    </Tag>
                  )}
                </span>
              }
              description={
                showCards ? (
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                    ✓ Проголосовал: {vote.value}
                  </span>
                ) : (
                  <span style={{ color: '#8c8c8c' }}>
                    Ожидает раскрытия...
                  </span>
                )
              }
            />
          </List.Item>
        )}
      />

      {showCards && (
        <div style={{ marginTop: 16, padding: '12px', background: '#f6f6f6', borderRadius: '4px' }}>
          <strong>Статистика:</strong>
          <div style={{ marginTop: 8 }}>
            Всего голосов: {votes.length} | 
            Числовые оценки: {votes.filter(v => v.value !== '?').length} | 
            Не определились: {votes.filter(v => v.value === '?').length}
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingResults;