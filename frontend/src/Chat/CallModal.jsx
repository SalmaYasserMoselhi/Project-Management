import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  FiPhone,
  FiPhoneOff,
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
} from "react-icons/fi";
import { chatActions } from "../features/Slice/ChatSlice/chatSlice";
import { acceptCall, rejectCall } from "../utils/socket";
import { useChat } from "../context/chat-context";

function CallModal() {
  const dispatch = useDispatch();
  const { currentUser } = useChat();
  const { currentCall } = useSelector((state) => state.chat);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    if (currentCall?.status === "accepted" && currentCall.type === "video") {
      startVideo();
    }

    return () => {
      stopVideo();
    };
  }, [currentCall]);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: currentCall.type === "video",
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // هنا يمكنك إضافة منطق WebRTC لإرسال الفيديو للطرف الآخر
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("لا يمكن الوصول إلى الكاميرا أو الميكروفون");
    }
  };

  const stopVideo = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const handleAcceptCall = () => {
    acceptCall({
      callId: currentCall.id,
      type: currentCall.type,
    });
    dispatch(
      chatActions.setCurrentCall({ ...currentCall, status: "accepted" })
    );
  };

  const handleRejectCall = () => {
    rejectCall({
      callId: currentCall.id,
    });
    dispatch(chatActions.setCurrentCall(null));
  };

  const toggleAudio = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject
        .getAudioTracks()
        .find((track) => track.kind === "audio");

      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject
        .getVideoTracks()
        .find((track) => track.kind === "video");

      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  if (!currentCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6">
          {currentCall.type === "video" && (
            <div className="relative aspect-video bg-gray-900 rounded-lg mb-4">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full rounded-lg"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-32 rounded-lg border-2 border-white"
              />
            </div>
          )}

          <div className="text-center mb-6">
            <h3 className="text-xl font-medium mb-2 text-[#4D2D61]">
              {currentCall.status === "initiating"
                ? "جاري الاتصال..."
                : currentCall.status === "incoming"
                ? "مكالمة واردة"
                : `مكالمة ${currentCall.type === "video" ? "فيديو" : "صوتية"}`}
            </h3>
            <p className="text-gray-500">{currentCall.recipientName}</p>
          </div>

          <div className="flex items-center justify-center gap-4">
            {currentCall.status === "incoming" ? (
              <>
                <button
                  onClick={handleAcceptCall}
                  className="p-4 bg-[#4D2D61] text-white rounded-full hover:bg-[#57356A]"
                >
                  <FiPhone className="w-6 h-6" />
                </button>
                <button
                  onClick={handleRejectCall}
                  className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <FiPhoneOff className="w-6 h-6" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleAudio}
                  className={`p-4 rounded-full ${
                    isAudioEnabled ? "bg-gray-200" : "bg-red-500 text-white"
                  }`}
                >
                  {isAudioEnabled ? (
                    <FiMic className="w-6 h-6" />
                  ) : (
                    <FiMicOff className="w-6 h-6" />
                  )}
                </button>

                {currentCall.type === "video" && (
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full ${
                      isVideoEnabled ? "bg-gray-200" : "bg-red-500 text-white"
                    }`}
                  >
                    {isVideoEnabled ? (
                      <FiVideo className="w-6 h-6" />
                    ) : (
                      <FiVideoOff className="w-6 h-6" />
                    )}
                  </button>
                )}

                <button
                  onClick={handleRejectCall}
                  className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <FiPhoneOff className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallModal;
