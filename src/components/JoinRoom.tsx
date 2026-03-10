import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Radio, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { roomStore } from '../stores/RoomStore';

const JoinRoom = observer(() => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<'owner' | 'voter'>('voter');

  const onJoinAsOwner = async (values: any) => {
    if (!roomId) return;

    try {
      const { ownerPassword } = values;

      // Присоединяемся как owner через WebSocket
      await roomStore.joinRoom(roomId, 'Owner', true, ownerPassword);

      message.success('Добро пожаловать, Owner!');
      navigate(`/room/${roomId}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Ошибка при входе как Owner');
      console.error(error);
    }
  };

  const onJoinAsVoter = async (values: any) => {
    if (!roomId) return;

    try {
      const { userName } = values;

      // Присоединяемся как voter через WebSocket
      await roomStore.joinRoom(roomId, userName, false);

      message.success('Добро пожаловать в комнату!');
      navigate(`/room/${roomId}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Ошибка при входе');
      console.error(error);
    }
  };

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
                <Button type="primary" htmlType="submit" loading={roomStore.isLoading} block size="large">
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
                label="Ваше имя (Owner)"
                name="ownerName"
                rules={[{ required: true, message: 'Введите ваше имя' }]}
                initialValue="Owner"
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="Введите имя" 
                  size="large"
                />
              </Form.Item>
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
                <Button type="primary" htmlType="submit" loading={roomStore.isLoading} block size="large">
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