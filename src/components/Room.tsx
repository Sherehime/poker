import { useState } from 'react';
import { Card, Typography, Alert, Space, List, Button, Tag, Divider, Statistic, Row, Col, message, Descriptions, Tooltip, Input } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, CopyOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { roomStore } from '../stores/RoomStore';
import VotingCards from './VotingCards';
import VotingResults from './VotingResults';
import History from './History';

const { Title, Text } = Typography;

const Room = observer(() => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  if (!roomStore.currentRoom || !roomStore.currentUser) {
    return (
      <Alert
        message="Нет активной комнаты"
        description="Пожалуйста, войдите в комнату"
        type="error"
        showIcon
      />
    );
  }

  const { currentRoom, currentUser } = roomStore;
  const currentSession = currentRoom.currentVotingSession;

  const handleStartVoting = (taskId: string) => {
    roomStore.createVotingSession(taskId);
    setSelectedTaskId(taskId);
    message.success('Голосование запущено!');
  };

  const handleCompleteVoting = () => {
    roomStore.completeVoting();
    message.success('Голосование завершено!');
    setSelectedTaskId(null);
  };

  const currentTask = currentSession 
    ? currentRoom.tasks.find(t => t.id === currentSession.taskId)
    : null;

  const allVoted = currentSession && currentSession.votes.length === currentRoom.participants.length;

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Заголовок комнаты */}
        <Card>
          <Row gutter={16}>
            <Col span={16}>
              <Title level={2} style={{ margin: 0 }}>{currentRoom.name}</Title>
              <Text type="secondary">Вы вошли как: </Text>
              <Tag color={currentUser.isOwner ? 'gold' : 'blue'}>
                {currentUser.isOwner ? '👑 Owner' : '👤 Участник'}
              </Tag>
              <Text strong> {currentUser.name}</Text>
            </Col>
            <Col span={8}>
              <Statistic
                title="Участников"
                value={currentRoom.participants.length}
                prefix={<TeamOutlined />}
                suffix="/ 10"
              />
            </Col>
          </Row>
          
          {currentUser.isOwner && (
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                🔗 Ссылка для приглашения участников:
              </Text>
              <Input
                value={`${window.location.origin}/room/${currentRoom.id}`}
                readOnly
                addonAfter={
                  <Tooltip title="Скопировать ссылку">
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/room/${currentRoom.id}`);
                        message.success('Ссылка скопирована в буфер обмена!');
                      }}
                    />
                  </Tooltip>
                }
                style={{ cursor: 'pointer' }}
              />
            </div>
          )}
        </Card>

        {/* Активное голосование */}
        {currentSession && currentTask && (
          <Card 
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <span>Идёт голосование: {currentTask.title}</span>
              </Space>
            }
            extra={
              currentUser.isOwner && allVoted && (
                <Button 
                  type="primary" 
                  icon={<CheckCircleOutlined />}
                  onClick={handleCompleteVoting}
                >
                  Раскрыть карты
                </Button>
              )
            }
          >
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Задача">{currentTask.title}</Descriptions.Item>
              <Descriptions.Item label="Описание">
                {currentTask.description || 'Нет описания'}
              </Descriptions.Item>
              <Descriptions.Item label="Проголосовали">
                {currentSession.votes.length} / {currentRoom.participants.length}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                {allVoted ? (
                  <Tag color="green">Все проголосовали</Tag>
                ) : (
                  <Tag color="processing">Ожидание голосов</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            {currentUser.isOwner ? (
              <VotingResults votes={currentSession.votes} showCards={false} />
            ) : (
              <VotingCards taskId={currentTask.id} />
            )}
          </Card>
        )}

        {/* Результаты голосования (после завершения) */}
        {!currentSession && currentRoom.votingHistory.length > 0 && (
          <Card title="📊 Последнее голосование">
            <VotingResults 
              votes={currentRoom.votingHistory[currentRoom.votingHistory.length - 1].votes}
              showCards={true}
              finalEstimate={currentRoom.votingHistory[currentRoom.votingHistory.length - 1].finalEstimate}
            />
          </Card>
        )}

        {/* Список задач */}
        {currentUser.isOwner && !currentSession && (
          <Card title="📋 Задачи для оценки">
            <List
              dataSource={currentRoom.tasks}
              renderItem={(task) => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleStartVoting(task.id)}
                    >
                      Запустить голосование
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={task.title}
                    description={task.description || 'Без описания'}
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* Для участников - сообщение */}
        {!currentUser.isOwner && !currentSession && (
          <Alert
            message="Ожидание"
            description="Owner ещё не запустил голосование. Пожалуйста, подождите."
            type="info"
            showIcon
          />
        )}

        {/* История голосований */}
        {currentRoom.votingHistory.length > 0 && (
          <Card title="📜 История голосований">
            <History room={currentRoom} />
          </Card>
        )}

        {/* Участники комнаты */}
        <Card title="👥 Участники комнаты">
          <List
            dataSource={currentRoom.participants}
            renderItem={(participant) => (
              <List.Item>
                <Space>
                  {participant.isOwner && <Tag color="gold">👑 Owner</Tag>}
                  <Text strong>{participant.name}</Text>
                  {currentSession && currentSession.votes.find(v => v.userId === participant.id) && (
                    <Tag color="green">✓ Проголосовал</Tag>
                  )}
                </Space>
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </div>
  );
});

export default Room;