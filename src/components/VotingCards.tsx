import { useState } from 'react';
import { Card, Row, Col, Button, message } from 'antd';
import { observer } from 'mobx-react-lite';
import { roomStore } from '../stores/RoomStore';
import type { VoteValue } from '../types';

interface VotingCardsProps {
  taskId: string;
}

const FIBONACCI_VALUES: VoteValue[] = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, '?'];

const VotingCards = observer(({ taskId }: VotingCardsProps) => {
  const [selectedValue, setSelectedValue] = useState<VoteValue | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  if (!roomStore.currentRoom || !roomStore.currentUser) {
    return null;
  }

  const currentSession = roomStore.currentRoom.currentVotingSession;
  const userVote = currentSession?.votes.find(v => v.userId === roomStore.currentUser!.id);

  const handleVote = (value: VoteValue) => {
    if (userVote) {
      message.warning('Вы уже проголосовали!');
      return;
    }

    roomStore.vote(taskId, value);
    setSelectedValue(value);
    setHasVoted(true);
    message.success('Ваш голос принят!');
  };

  const isDisabled = !!userVote;

  return (
    <div>
      <Row gutter={[16, 16]}>
        {FIBONACCI_VALUES.map((value) => (
          <Col xs={8} sm={6} md={4} lg={3} key={value}>
            <Button
              size="large"
              type={selectedValue === value || userVote?.value === value ? 'primary' : 'default'}
              disabled={isDisabled}
              onClick={() => handleVote(value)}
              style={{
                height: '80px',
                fontSize: '24px',
                fontWeight: 'bold',
                borderRadius: '8px',
              }}
              block
            >
              {value}
            </Button>
          </Col>
        ))}
      </Row>
      {userVote && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button type="link" onClick={() => {
            setSelectedValue(userVote.value);
            setHasVoted(true);
          }}>
            Вы проголосовали: <strong>{userVote.value}</strong>
          </Button>
        </div>
      )}
    </div>
  );
});

export default VotingCards;