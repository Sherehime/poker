import { Card, Button, Space, Typography } from 'antd';
import { PlusOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

  const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2}>🎲 Покер-планирование</Title>
            <Paragraph>
              Приложение для покер-планирования с использованием WebSocket
            </Paragraph>
          </div>

          <div>
            <Paragraph>
              Создайте комнату и пригласите команду для оценки задач
            </Paragraph>
          </div>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              block
              onClick={() => navigate('/create')}
            >
              Создать новую комнату
            </Button>

            <Button
              icon={<LoginOutlined />}
              size="large"
              block
              onClick={() => {
                const roomId = prompt('Введите ID комнаты:');
                if (roomId) {
                  navigate(`/join/${roomId}`);
                }
              }}
            >
              Войти в существующую комнату
            </Button>
          </Space>

          <div style={{ marginTop: 24, textAlign: 'left' }}>
            <Title level={4}>Как это работает:</Title>
            <ol style={{ paddingLeft: 20, lineHeight: '1.8' }}>
              <li>Создайте комнату как Owner и добавьте задачи</li>
              <li>Поделитесь ссылкой с командой</li>
              <li>Выберите задачу и запустите голосование</li>
              <li>Команда голосует по шкале Фибоначчи</li>
              <li>Раскройте карты и посмотрите результаты</li>
            </ol>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Home;