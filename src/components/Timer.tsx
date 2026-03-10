import { useEffect, useState } from 'react';
import { Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TimerProps {
  startedAt?: Date;
  isRunning: boolean;
}

export default function Timer({ startedAt, isRunning }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) {
      setElapsed(0);
      return;
    }

    const startTime = new Date(startedAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startedAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRunning) {
    return null;
  }

  // Показываем таймер даже когда elapsed = 0

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '8px',
      padding: '8px 16px',
      background: '#f0f2f5',
      borderRadius: '4px',
    }}>
      <ClockCircleOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
      <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
        {formatTime(elapsed)}
      </Text>
    </div>
  );
}