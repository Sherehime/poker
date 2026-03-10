import { List, Tag, Card, Typography, Empty, Space } from 'antd';
import { HistoryOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { Room, Task } from '../types';

const { Text } = Typography;

interface HistoryProps {
  room: Room;
}

interface TaskWithVotes {
  task: Task;
  sessions: Array<{
    finalEstimate: number | '?';
    date: Date;
    participantCount: number;
    duration?: number;
  }>;
}

const History = ({ room }: HistoryProps) => {
  if (room.votingHistory.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="История голосований пуста"
      />
    );
  }

  // Форматирование длительности
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}м ${secs}с`;
  };

  // Группируем сессии по задачам
  const tasksWithVotes: TaskWithVotes[] = room.tasks.map(task => ({
    task,
    sessions: room.votingHistory
      .filter(session => session.taskId === task.id)
      .map(session => ({
        finalEstimate: session.finalEstimate || '?',
        date: new Date(session.createdAt),
        participantCount: session.votes.length,
        duration: session.duration,
      })),
  })).filter(item => item.sessions.length > 0);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {tasksWithVotes.map(({ task, sessions }) => (
        <Card
          key={task.id}
          size="small"
          title={<Text strong>{task.title}</Text>}
        >
          <List
            dataSource={sessions}
            renderItem={(session, index) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<HistoryOutlined />}
                  title={
                    <Space>
                      <Text>Голосование #{sessions.length - index}</Text>
                      <Tag color="blue">Оценка: {session.finalEstimate}</Tag>
                    </Space>
                  }
                  description={
                    <Space>
                      <Text type="secondary">
                        {session.date.toLocaleString('ru-RU')}
                      </Text>
                      <Text type="secondary">•</Text>
                      <Text type="secondary">
                        {session.participantCount} участников
                      </Text>
                      {session.duration !== undefined && (
                        <>
                          <Text type="secondary">•</Text>
                          <Space size={4}>
                            <ClockCircleOutlined />
                            <Text type="secondary">{formatDuration(session.duration)}</Text>
                          </Space>
                        </>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      ))}
    </Space>
  );
};

export default History;
