import { useState } from 'react';
import { Form, Input, Button, Card, message, Space, Divider } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { roomStore } from '../stores/RoomStore';

const CreateRoom = observer(() => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    try {
      const { roomName, ownerName, ownerPassword, tasks } = values;

      // Создаём комнату через WebSocket
      await roomStore.createRoom(
        roomName,
        ownerName,
        ownerPassword,
        tasks || []
      );

      message.success('Комната создана успешно!');

      // Перенаправляем в комнату
      if (roomStore.currentRoom) {
        navigate(`/room/${roomStore.currentRoom.id}`);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Ошибка при создании комнаты');
      console.error(error);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Card title="Создать комнату для покер-планирования">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Название комнаты"
            name="roomName"
            rules={[{ required: true, message: 'Введите название комнаты' }]}
          >
            <Input placeholder="Например: Команда Frontend" />
          </Form.Item>

          <Form.Item
            label="Ваше имя (Owner)"
            name="ownerName"
            rules={[{ required: true, message: 'Введите ваше имя' }]}
          >
            <Input placeholder="Иван Иванов" />
          </Form.Item>

          <Form.Item
            label="Пароль комнаты"
            name="ownerPassword"
            rules={[
              { required: true, message: 'Придумайте пароль' },
              { min: 4, message: 'Минимум 4 символа' },
            ]}
            tooltip="Этот пароль понадобится вам для повторного входа как Owner"
          >
            <Input.Password placeholder="Введите пароль" />
          </Form.Item>

          <Divider>Задачи для оценки</Divider>

          <Form.List name="tasks">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'title']}
                      rules={[{ required: true, message: 'Название задачи' }]}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder="Название задачи" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'description']}
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input placeholder="Описание (опционально)" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Добавить задачу
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={roomStore.isLoading} block size="large">
              Создать комнату
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
});

export default CreateRoom;