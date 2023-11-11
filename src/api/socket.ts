import { io, Socket } from 'socket.io-client';
import { SERVER_URL, SERVER_ID } from '../constant';

let socket: Socket | null = null;

export const loginSocket = (accessToken: any) => {
  socket = io(`${SERVER_URL}/server`, {
    extraHeaders: {
      Authorization: `Bearer ${accessToken}`,
      serverId: SERVER_ID,
    },
  });

  return socket;
};

export const drawSocket = io(
  'https://young-wave-37170-0a19781643d5.herokuapp.com/',
  {
    withCredentials: true,
  },
);

export const disconnectLoginSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const chatSocket = (accessToken: any, chatId: string) => {
  socket = io(`${SERVER_URL}/chat?chatId=${chatId}`, {
    extraHeaders: {
      Authorization: `Bearer ${accessToken}`,
      serverId: SERVER_ID,
    },
  });
  socket.emit('fetch-messages');

  // 예제로 fetch-messages 이벤트를 발생시키고, 서버에서 받은 메시지를 콘솔에 출력
  socket.on('connect', () => {
    console.log('Connected from server');
  });

  // 소켓 연결이 끊어졌을 때 처리
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  return socket;
};
