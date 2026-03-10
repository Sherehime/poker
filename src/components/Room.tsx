import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Alert, Space, List, Button, Tag, Statistic, Row, Col, message, Descriptions, Tooltip, Input } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, TeamOutlined, CopyOutlined, LogoutOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { roomStore } from '../stores/RoomStore';
import VotingCards from './VotingCards';
import VotingResults from './VotingResults';
import History from './History';
import Timer from './Timer';

const { Title, Text } = Typography;

const Room = observer(() => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Если комнаты нет в сторе, пытаемся загрузить
  if (!roomStore.currentRoom && roomId) {
    // Показываем сообщение, что нужно войти
    return (
      <Alert
        message="Необходимо войти в комнату"
        description="Пожалуйста, пройдите по ссылке-приглашению"
        type="warning"
        showIcon
        action={
          <Button onClick={() => navigate(`/join/${roomId}`)}>
            Войти в комнату
          </Button>
        }
      />
    );
  }

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

  const handleLeaveRoom = () => {
    roomStore.leaveRoom();
    navigate('/');
    message.success('Вы покинули комнату');
  };

  const handleStartVoting = (taskId: string) => {
    try {
      roomStore.startVoting(taskId);
      message.success('Голосование запущено!');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Ошибка при запуске голосования');
    }
  };

  const handleCompleteVoting = () => {
    try {
      roomStore.completeVoting();
      message.success('Голосование завершено!');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Ошибка при завершении голосования');
    }
  };

  const handleCopyInviteLink = () => {
    const link = roomStore.getInviteLink();
    navigator.clipboard.writeText(link);
    message.success('Ссылка скопирована в буфер обмена!');
  };

  const { currentRoom, currentUser, currentVotingSession } = roomStore;

  const currentTask = currentVotingSession 
    ? currentRoom.tasks.find(t => t.id === currentVotingSession.taskId)
    : null;

  const allVoted = currentVotingSession && currentVotingSession.votes.length === currentRoom.participants.length;

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Заголовок комнаты */}
        <Card
          extra={
            <Button 
              icon={<LogoutOutlined />}
              onClick={handleLeaveRoom}
              danger
            >
              Покинуть комнату
            </Button>
          }
        >
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
                value={roomStore.getInviteLink()}
                readOnly
                addonAfter={
                  <Tooltip title="Скопировать ссылку">
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={handleCopyInviteLink}
                    />
                  </Tooltip>
                }
                style={{ cursor: 'pointer' }}
              />
            </div>
          )}
        </Card>

        {/* Активное голосование */}
        {currentVotingSession && currentTask && (
          <Card 
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <span>Идёт голосование: {currentTask.title}</span>
              </Space>
            }
            extra={
              <Space>
                <Timer 
                  startedAt={currentVotingSession.startedAt} 
                  isRunning={true} 
                />
                {currentUser.isOwner && allVoted && (
                  <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />}
                    onClick={handleCompleteVoting}
                  >
                    Раскрыть карты
                  </Button>
                )}
              </Space>
            }
          >
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Задача">{currentTask.title}</Descriptions.Item>
              <Descriptions.Item label="Описание">
                {currentTask.description || 'Нет описания'}
              </Descriptions.Item>
              <Descriptions.Item label="Проголосовали">
                {currentVotingSession.votes.length} / {currentRoom.participants.length}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                {allVoted ? (
                  <Tag color="green">Все проголосовали</Tag>
                ) : (
                  <Tag color="processing">Ожидание голосов</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            <VotingCards taskId={currentTask.id} />
          </Card>
        )}

        {/* Результаты голосования (после завершения) */}
        {!currentVotingSession && currentRoom.votingHistory.length > 0 && (
          <Card title="📊 Последнее голосование">
            <VotingResults 
              votes={currentRoom.votingHistory[0].votes}
              showCards={true}
              finalEstimate={currentRoom.votingHistory[0].finalEstimate}
            />
          </Card>
        )}

        {/* Список задач - только для Owner и только когда нет активного голосования */}
        {currentUser.isOwner && !currentVotingSession && (
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
        {!currentUser.isOwner && !currentVotingSession && (
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
                  {currentVotingSession && currentVotingSession.votes.find(v => v.userId === participant.id) && (
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