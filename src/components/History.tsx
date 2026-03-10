import { List, Tag, Card, Typography, Empty, Space } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
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

  // Группируем сессии по задачам
  const tasksWithVotes: TaskWithVotes[] = room.tasks.map(task => ({
    task,
    sessions: room.votingHistory
      .filter(session => session.taskId === task.id)
      .map(session => ({
        finalEstimate: session.finalEstimate || '?',
        date: new Date(session.createdAt),
        participantCount: session.votes.length,
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
                    <Text type="secondary">
                      {session.date.toLocaleString('ru-RU')} • 
                      {session.participantCount} участников
                    </Text>
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