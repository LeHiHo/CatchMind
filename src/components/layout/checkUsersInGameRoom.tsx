import React, { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { accessTokenState, onlineUserStateInGameRoom } from '../../states/atom';
import { io } from 'socket.io-client';
import { SERVER_URL, SERVER_ID } from '../../constant';

interface ChattingDetailProps {
  chatId: string;
}

const CheckUsersInGameRoom: React.FC<ChattingDetailProps> = ({ chatId }) => {
  const accessToken: any = useRecoilValue(accessTokenState);
  const [UsersInGameRoom, setUsersInGameRoom] = useRecoilState<string[]>(
    onlineUserStateInGameRoom,
  );

  useEffect(() => {
    try {
      const socket = io(`${SERVER_URL}/chat?chatId=${chatId}`, {
        extraHeaders: {
          Authorization: `Bearer ${accessToken}`,
          serverId: SERVER_ID,
        },
      });

      socket.on('connect', () => {
        socket?.emit('users');
      });

      socket.on('users-to-client', (data) => {
        setUsersInGameRoom(data.users);
      });

      return () => {
        socket.disconnect();
      };
    } catch (error) {
      console.error('Error retrieving data:', error);
    }
  }, [accessToken, chatId]);
  console.log(UsersInGameRoom);
  return (
    <>
      {UsersInGameRoom.map((userName, index) => (
        <div key={index}>
          <p>{userName}</p>
        </div>
      ))}
    </>
  );
};

export default CheckUsersInGameRoom;