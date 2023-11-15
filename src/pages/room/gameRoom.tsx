import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Drawing from '../../components/template/drawing';
import LeaveGameRoom from '../../components/layout/leaveGameRoom';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  chattingIdState,
  myMessageState,
  roomIdState,
  usersInRoom,
} from '../../states/atom';
import styled from 'styled-components';
import inviteImg from '../../assets/icons/invite.png';
import GameChatting from '../../components/template/GameChatting';
import { controlBack } from '../../hooks/leaveHandle';
import CheckUsersInGameRoom from '../../components/layout/checkUsersInGameRoom';
import CheckNums from '../../util/checkNums';
import { gameSocket } from '../../api/socket';
import AnswerForm from '../../components/template/AnswerForm';

const GameRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [roomId, setRoomId] = useRecoilState(chattingIdState);
  const [buttonVisible, setButtonVisible] = useState(true);
  const [submitVisible, setSubmitVisible] = useState(false);
  const [whoIsCaptain, SetWhoIsCaptain] = useState('');

  const [isQuizMasterAlertShown, setIsQuizMasterAlertShown] = useState(false); //출제자 확인알람 추가
  const [answer, setAnswer] = useState<string>(''); // 답 지정하기
  const [messages, setMessages] = useRecoilState(myMessageState); // 채팅창 메세지 받기
  const [userMessage, setUserMessage] = useState<{
    chatId: string;
    text: string;
    userId: string;
  }>({
    chatId: '',
    text: '',
    userId: '',
  });

  const lastMessage = messages[messages.length - 1];
  const myId = localStorage.getItem('id');
  useEffect(() => {
    if (lastMessage.text !== '') {
      setUserMessage(lastMessage);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (id) {
      setRoomId(id.substring(1));
    }
  }, [id, setRoomId]);

  // 게임로직 소켓
  useEffect(() => {
    gameSocket.connect();

    gameSocket.emit('joinRoom', roomId);

    gameSocket.on('quiz_master_set', (quizMasterId: string) => {
      console.log(myId, quizMasterId);
      if (true) {
        if (myId === quizMasterId) {
          alert('당신은 출제자 입니다!');
        } else {
          alert('새로운 출제자가 선정되었습니다!');
        }
        setIsQuizMasterAlertShown(true);
      }
    });

    return () => {
      gameSocket.off('quiz_master_set');
    };
  }, [roomId]);

  const startGame = () => {
    gameSocket.emit('start_game', { roomId, myId });
    // setIsQuizMasterAlertShown(false); // 게임이 시작될 때마다 상태를 초기화
  };

  const handleSetAnswerChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setAnswer(event.target.value);
  };

  const submitSetAnswer = () => {
    gameSocket.emit('set_answer', answer, { roomId, myId, notifyAll: true });

    setAnswer(''); // 입력 필드 초기화
  };
  useEffect(() => {
    gameSocket.on('alert_all', (message: string) => {
      if (message) {
        alert('문제 출제 끝');
      }
    });
    return () => {
      gameSocket.off('alert_all');
    };
  }, [roomId]);

  useEffect(() => {
    gameSocket.on('game_ended', (message) => {
      alert(message);
    });
    return () => {
      gameSocket.off('game_ended');
    };
  }, [roomId]);

  useEffect(() => {
    if (userMessage) {
      if (userMessage.userId === myId) {
        gameSocket.emit('submit_answer', userMessage, { roomId, myId });
      }
    }
    const handleCorrectAnswer = (data: { winner: string }) => {
      console.log(data.winner, myId);
      if (data.winner === myId) {
        alert('축하합니다! 정답입니다!');
      } else if (data.winner !== myId) {
        alert('누군가 정답을 맞췄습니다!');
      }
      gameSocket.emit('end_game', { roomId: roomId });
    };
    gameSocket.on('correct_answer', handleCorrectAnswer);

    return () => {
      gameSocket.off('correct_answer', handleCorrectAnswer);
      gameSocket.off('end_game');
    };
  }, [roomId, gameSocket, userMessage]);

  const roomNum = useRecoilValue(roomIdState);
  const users = useRecoilValue(usersInRoom);

  return (
    <Game>
      <RoomHeader>
        <RoomInfo>
          <RoomInformation>방 번호</RoomInformation>
          <RoomInformation>{roomNum}</RoomInformation>
          <RoomInformation>인원 수 </RoomInformation>
          <RoomInformation>{users} / 4</RoomInformation>
          {/* 인원수 추가 */}
        </RoomInfo>
        {/* <InviteGameRoom chatId={chat}></InviteGameRoom> */}
        <BtnGroup>
          <LeaveGameRoom chatId={roomId}></LeaveGameRoom>
          <button onClick={startGame}>start game</button>
          <div>
            <input
              type="text"
              value={answer}
              onChange={handleSetAnswerChange}
            />
            <button onClick={submitSetAnswer}>Submit Answer</button>
          </div>
          {/* {submitVisible && <AnswerForm onSubmit={handleSubmit} />} */}
        </BtnGroup>
      </RoomHeader>

      <RoomMain>
        <Drawing />

        <GameChatting chatId={roomId} />
      </RoomMain>
      <CheckUsersInGameRoom chatId={roomId}></CheckUsersInGameRoom>
      <UserList>{/* <CheckUser /> */}</UserList>
    </Game>
  );
};

const Game = styled.div`
  width: 1200px;
  display: flex;
  flex-direction: column;
`;

const RoomHeader = styled.div`
  display: flex;
  justify-content: end;
  margin-top: 30px;
`;

const RoomInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  justify-content: center;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  text-align: center;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  color: #718096;
`;

const RoomInformation = styled.div`
  padding: 5px;

  &:first-child {
    background-color: #edf2f7;
    padding-left: 15px;
    padding-right: 15px;
  }

  &:nth-child(3) {
    background-color: #edf2f7;
  }
`;

const BtnGroup = styled.div`
  display: flex;
  align-items: center;
  margin-left: 260px;
`;

const RoomMain = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const UserList = styled.div`
  margin-top: 20px;
`;
export default GameRoom;
