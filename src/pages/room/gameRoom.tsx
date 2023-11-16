import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Drawing from '../../components/template/drawing';
import LeaveGameRoom from '../../components/layout/leaveGameRoom';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  btnState,
  chattingIdState,
  myMessageState,
  roomIdState,
  userRoomState,
  submitState,
  usersInRoom,
  userState,
} from '../../states/atom';
import styled from 'styled-components';
import GameChatting from '../../components/template/GameChatting';
import { controlBack } from '../../hooks/leaveHandle';
import CheckUsersInGameRoom from '../../components/layout/checkUsersInGameRoom';
import { sortCreatedAt } from '../../util/util';
import {
  Chat,
  ChatResponse,
  OnlyResponse,
  User,
} from '../../interfaces/interface';
import { getAllGameRooms, getOnlyGameRoom } from '../../api';
import { AxiosResponse } from 'axios';
import AnswerForm from '../../components/template/AnswerForm';
import { ResponsiveValue } from '@chakra-ui/react';
import CheckNums from '../../util/checkNums';
import { gameSocket } from '../../api/socket';
import { getCookie } from '../../util/util';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Fade,
} from '@chakra-ui/react';

const GameRoom: React.FC = () => {
  const [showAlert, setShowAlert] = useState({
    active: false,
    message: '',
  });

  useEffect(() => {
    if (showAlert.active) {
      const timer = setTimeout(() => {
        setShowAlert({ active: false, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAlert.active]);

  const { id } = useParams<{ id: string }>();
  const [chat, setChat] = useRecoilState(chattingIdState);
  const userNumber = useRecoilValue(userState);
  const [roomNumber, setRoomNumber] = useState<number | null>(null);

  const [roomId, setRoomId] = useRecoilState(chattingIdState);
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
  const myId = getCookie('userId');
  const [userRoomUser, setUserRoomUser] = useState(0);

  useEffect(() => {
    setUserRoomUser(userNumber);
  }, [roomNumber]);
  const check = CheckNums();

  const [btnVisible, setBtnVisible] = useState(true);
  const [submitVisible, setSubmitVisible] = useState(false);
  useEffect(() => {
    if (lastMessage.text !== '') {
      setUserMessage(lastMessage);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (id) {
      setRoomId(id.substring(1));

      fetchRoomNumber();
    }
  }, [id, setRoomId]);

  const fetchRoomNumber = async () => {
    try {
      if (id) {
        const allRoomsData = await getAllGameRooms();
        const createAtData: Chat[] = await sortCreatedAt(allRoomsData);
        // 방번호 넣기
        const plusIndex = createAtData.map((chat, index) => ({
          ...chat,
          index: index + 1,
        }));

        console.log(plusIndex);

        const findIndex = async (chatId: string): Promise<number | null> => {
          const foundChat = await plusIndex.find((chat) => chat.id === chatId);
          if (foundChat) {
            return foundChat.index;
          }
          return null;
        };

        const roomData = await findIndex(id.substring(1));
        setRoomNumber(roomData);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // 게임로직 소켓
  useEffect(() => {
    gameSocket.connect();

    gameSocket.emit('joinRoom', roomId);

    gameSocket.on('quiz_master_set', (quizMasterId: string) => {
      console.log('여기', myId, quizMasterId);
      if (true) {
        if (myId === quizMasterId) {
          // alert('당신은 출제자 입니다!');
          setShowAlert({
            active: true,
            message: '당신은 출제자 입니다!',
          });

          setSubmitVisible(true);
        } else {
          setShowAlert({
            active: true,
            message: '새로운 출제자가 선정되었습니다!',
          });

          setSubmitVisible(false);
        }
        setIsQuizMasterAlertShown(true);
        setBtnVisible(false);
      }
    });

    return () => {
      gameSocket.off('quiz_master_set');
    };
  }, [roomId]);

  const startGame = () => {
    gameSocket.emit('start_game', { roomId, myId });
    setIsQuizMasterAlertShown(false); // 게임이 시작될 때마다 상태를 초기화
    setBtnVisible(false);
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
        setShowAlert({
          active: true,
          message: '문제가 출제되었습니다!',
        });
        setSubmitVisible(false);
      }
    });
    return () => {
      gameSocket.off('alert_all');
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
        setShowAlert({
          active: true,
          message: '축하합니다! 정답입니다! 게임이 종료되었습니다.',
        });
      } else if (data.winner !== myId) {
        setShowAlert({
          active: true,
          message: '유저가 정답을 맞췄습니다! 게임이 종료되었습니다.',
        });
      }
      setBtnVisible(true);
    };
    gameSocket.on('correct_answer', handleCorrectAnswer);

    return () => {
      gameSocket.off('correct_answer', handleCorrectAnswer);
    };
  }, [roomId, gameSocket, userMessage]);

  return (
    <Game>
      <RoomHeader>
        <RoomInfo>
          <RoomInformation>방 번호</RoomInformation>
          <RoomInformation>{roomNumber}</RoomInformation>
          <RoomInformation>인원 수 </RoomInformation>
          <RoomInformation>{userRoomUser} / 4</RoomInformation>
          {/* 인원수 추가 */}
        </RoomInfo>
        {/* <InviteGameRoom chatId={chat}></InviteGameRoom> */}
        <BtnGroup>
          <LeaveGameRoom chatId={roomId}></LeaveGameRoom>
          {check && btnVisible && (
            <button onClick={startGame}>Start Game</button>
          )}
          {submitVisible && (
            <div>
              <input
                type="text"
                value={answer}
                onChange={handleSetAnswerChange}
              />
              <button onClick={submitSetAnswer}>Submit Answer</button>
            </div>
          )}
          {/* {submitVisible && <AnswerForm onSubmit={handleSubmit} />} */}
        </BtnGroup>
      </RoomHeader>

      <RoomMain>
        <Drawing />

        <GameChatting chatId={roomId} />
      </RoomMain>

      <CheckUsersInGameRoom chatId={roomId} />

      <Fade in={showAlert.active}>
        <Alert
          bg={'#4FD1C5'}
          color={'white'}
          marginTop={5}
          marginBottom={3}
          status="success"
          width={400}
          height={70}
          borderRadius={10}>
          <AlertIcon color={'white'} />
          <Box>
            <AlertTitle mr={2}>GameRoom</AlertTitle>
            <AlertDescription>{showAlert.message}</AlertDescription>
          </Box>
        </Alert>
      </Fade>
    </Game>
  );
};

const Game = styled.div`
  width: 1400px;
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
  margin-top: 30px;
  margin-bottom: 30px;
`;
export default GameRoom;
