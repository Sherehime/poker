import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Radio, message, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { roomStore } from '../stores/RoomStore';

const JoinRoom = observer(() => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'owner' | 'voter'>('voter');
  const [roomExists, setRoomExists] = useState(true);

  useEffect(() => {
    // Проверяем существование комнаты
    if (roomId) {
      const room = roomStore.getRoomById(roomId);
      if (!room) {
        setRoomExists(false);
        message.error('Комната не найдена');
      } else {
        // Проверяем, есть ли уже сохранённая сессия
        const currentUserData = roomStore.currentUser;
        if (currentUserData && roomStore.currentRoom?.id === roomId) {
          // Уже авторизованы, перенаправляем
          navigate(`/room/${roomId}/voting`);
        }
      }
    }
  }, [roomId, navigate]);

  const onJoinAsOwner = async (values: any) => {
    if (!roomId) return;
    setLoading(true);

    try {
      const { ownerPassword } = values;
      
      if (!roomStore.verifyOwnerPassword(roomId, ownerPassword)) {
        message.error('Неверный пароль');
        setLoading(false);
        return;
      }

      const room = roomStore.getRoomById(roomId);
      if (!room) {
        message.error('Комната не найдена');
        setLoading(false);
        return;
      }

      roomStore.setCurrentUser(roomId, room.ownerId, true);
      message.success('Добро пожаловать, Owner!');
      navigate(`/room/${roomId}/voting`);
    } catch (error) {
      message.error('Ошибка при входе');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onJoinAsVoter = async (values: any) => {
    if (!roomId) return;
    setLoading(true);

    try {
      const { userName } = values;
      
      const room = roomStore.joinRoom(roomId, userName);
      if (!room) {
        message.error('Комната не найдена');
        setLoading(false);
        return;
      }

      // Находим созданного пользователя
      const newUser = room.participants[room.participants.length - 1];
      roomStore.setCurrentUser(roomId, newUser.id, false);
      
      message.success('Добро пожаловать в комнату!');
      navigate(`/room/${roomId}/voting`);
    } catch (error: any) {
      message.error(error.message || 'Ошибка при входе');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!roomExists) {
    return (
      <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <Alert
          message="Комната не найдена"
          description="Проверьте ссылку или создайте новую комнату"
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <Card title="Вход в комнату">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Radio.Group
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%' }}
              buttonStyle="solid"
            >
              <Radio.Button value="voter" style={{ width: '50%', textAlign: 'center' }}>
                Участник
              </Radio.Button>
              <Radio.Button value="owner" style={{ width: '50%', textAlign: 'center' }}>
                Owner
              </Radio.Button>
            </Radio.Group>
          </div>

          {role === 'voter' ? (
            <Form
              layout="vertical"
              onFinish={onJoinAsVoter}
              autoComplete="off"
            >
              <Form.Item
                label="Ваше имя"
                name="userName"
                rules={[{ required: true, message: 'Введите ваше имя' }]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="Введите имя" 
                  size="large"
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Войти как участник
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form
              layout="vertical"
              onFinish={onJoinAsOwner}
              autoComplete="off"
            >
              <Form.Item
                label="Пароль Owner"
                name="ownerPassword"
                rules={[{ required: true, message: 'Введите пароль' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Введите пароль Owner"
                  size="large"
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Войти как Owner
                </Button>
              </Form.Item>
            </Form>
          )}
        </Space>
      </Card>
    </div>
  );
});

export default JoinRoom;