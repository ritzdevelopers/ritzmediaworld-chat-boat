"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, X, Scan, Pause } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";
import axios from "axios";
import Image from "next/image";

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: Array<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): ISpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): ISpeechRecognition;
    };
  }
}

interface BTNSMSGS {
  msg: string;
  id: number;
}

function ChatBoat() {
  // ------------------------- OLD SESSION LOGIC -------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [lastDate, setLastDate] = useState<Date>();

  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const boatRef = useRef<HTMLDivElement>(null);

  const toggleChat = async () => {
    try {
      const res = await axios.get(
        "https://apis.contenaissance.com/api/v1/session/create",
        {
          headers: {
            "X-API-KEY":
              "26f8eb961b3d0b30a20b838cad928389aa38397695d78aa3f89f936903f42bce",
          },
        }
      );
      setSessionId(res.data.session_id);
      sessionStorage.setItem("RMW_SESSION", res.data.session_id);
      setLastDate(new Date());
    } catch (error) {
      console.error("Failed to create session:", error);
    }

    setIsOpen(!isOpen);
    if (backdropRef.current && !isOpen)
      backdropRef.current.style.display = "block";
  };

  const openBoat = () => {
    setIsOpen(true);
    const existingSession = sessionStorage.getItem("RMW_SESSION");
    if (!existingSession) {
      toggleChat();
    } else {
      setSessionId(existingSession);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !boatRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!lastDate) return;
    const expireMs = 15 * 60 * 1000; // 15 minutes
    const timer = setTimeout(async () => {
      try {
        await axios.post(
          "https://apis.contenaissance.com/api/v1/session/close",
          { session_id: sessionId },
          {
            headers: {
              "X-API-KEY":
                "26f8eb961b3d0b30a20b838cad928389aa38397695d78aa3f89f936903f42bce",
            },
          }
        );
      } catch (err) {
        console.error("Session close error:", err);
      }
    }, expireMs);
    return () => clearTimeout(timer);
  }, [lastDate, sessionId]);

  // ------------------------- NEW UI & CHAT LOGIC -------------------------
  const [isSmall, setIsSmall] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 786) {
        // Mobile logic
        setMobileView(true);
        setIsSmall(false);
      } else {
        setMobileView(false);
        setIsSmall(true);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const [msg, setMsg] = useState("");
  const [msgsQue, setMsgsQue] = useState<BTNSMSGS[]>([]);
  const [btnsQue, setBtnsQue] = useState<BTNSMSGS[]>([
    { id: 1, msg: "Digital Marketing" },
    { id: 2, msg: "Creative Solutions" },
    { id: 3, msg: "Print/Radio Advertising" },
    { id: 4, msg: "Web Design/Tech Solutions" },
  ]);
  const [resLoader, setResLoader] = useState(false);
  const chatReff = useRef<HTMLDivElement | null>(null);
  const [isAudiable, setIsAudiable] = useState(false);

  // Auto scroll
  useEffect(() => {
    if (chatReff.current)
      chatReff.current.scrollTop = chatReff.current.scrollHeight;
  }, [msgsQue]);

  const chattingHandler = async () => {
    if (!msg) return;
    setMsgsQue((pr) => [
      ...pr,
      { msg, id: pr.length > 0 ? pr[pr.length - 1].id + 1 : 1 },
    ]);
    setMsg("");

    try {
      setResLoader(true);
      const data = { session_id: sessionId, user_input: msg };
      const res = await axios.post(
        "https://apis.contenaissance.com/api/v1/chat/",
        data,
        {
          headers: {
            "X-API-KEY":
              "26f8eb961b3d0b30a20b838cad928389aa38397695d78aa3f89f936903f42bce",
          },
        }
      );
      setResLoader(false);
      if (res.data.response_html) {
        setMsgsQue((pr) => [
          ...pr,
          {
            msg: res.data.response_html,
            id: pr.length > 0 ? pr[pr.length - 1].id + 1 : 1,
          },
        ]);
        new Audio("/msg-receive.mp3").play().catch(() => {});
      }
    } catch (err) {
      console.log(err);

      setResLoader(false);
      setMsgsQue((pr) => [
        ...pr,
        {
          msg: "Sorry, unable to connect right now. Please try again!",
          id: pr.length > 0 ? pr[pr.length - 1].id + 1 : 1,
        },
      ]);
      new Audio("/msg-receive.mp3").play().catch(() => {});
    }
  };

  // Speech recognition
  useEffect(() => {
    const SpeechRec:
      | typeof window.SpeechRecognition
      | typeof window.webkitSpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.resultIndex].isFinal) {
        setMsg((prev) => `${prev} ${transcript}`);
      }
    };

    if (isAudiable) recognition.start();
    else recognition.stop();

    return () => recognition.stop();
  }, [isAudiable]);

  // GSAP animation
  useGSAP(() => {
    if (isOpen) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );
      gsap.fromTo(
        chatReff.current,
        { scale: 0.8, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5 }
      );
    } else {
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          backdropRef.current!.style.display = "none";
        },
      });
    }
  }, [isOpen]);

  // ------------------------- RENDER UI -------------------------

  return (
    <>
      {/* Full-screen blur backdrop */}
      <div
        ref={backdropRef}
        className={styles.backdrop}
        style={{ display: isOpen ? "block" : "none" }}
      />

      <div className={styles.chatContainer} ref={containerRef}>
        {/* Chat Boat Trigger */}
        <div ref={boatRef} className={styles.chatBoat}>
          {isOpen ? (
            <X
              className={styles.boatIcon}
              onClick={() => setIsOpen(false)} // ✅ close chat
            />
          ) : (
            <img
              src="https://cdn-icons-png.flaticon.com/512/6873/6873405.png"
              alt="Chat Icon"
              className={styles.boatGifIcon}
              onClick={openBoat} // only open
            />
          )}
          {!isOpen && <span className={styles.pulseAnimation}></span>}
        </div>

        {/* Chat Interface */}
        {isOpen && (
          <div className="w-screen h-screen fixed top-0 left-0  p-auto">
            <div
              style={{
                width: isSmall ? "460px" : "90%",
              }}
              className={`h-[90%] absolute top-1/2 -translate-y-1/2 bg-white overflow-hidden rounded-xl
    ${isSmall ? "right-80 translate-x-1/2" : "left-1/2 -translate-x-1/2"}
  `}
            >
              <div className="chatBotUi overflow-hidden  flex flex-col justify-between items-center bg-[#E3E3E3] w-full h-full pb-4">
                {/* This is header of chat bot ui  */}
                <div className="header w-full h-[4rem] bg-white flex justify-between items-center px-4">
                  <button className=" px-4 opacity-0 text-white py-2 rounded-4xl  hover:bg-[#215b05] bg-[#1b4307]">
                    Quick Response
                  </button>
                  {!mobileView && (
                    <Scan
                      onClick={() => setIsSmall((pr) => !pr)}
                      className="text-black cursor-pointer hover:text-[#202020] hover:scale-[1.1]"
                    />
                  )}
                </div>

                {/* This Is Main Area Where All Chat And Other Things Will Show  */}
                {msgsQue.length === 0 ? (
                  <div className="w-full flex flex-col items-center justify-center p-8">
                    {/* Greeting Section */}
                    <div className="max-w-lg text-center">
                      <div className="logo flex justify-center mb-6">
                        <Image
                          src="/rmw-logo-final.png"
                          alt="Ritz Media World Logo"
                          width={80}
                          height={80}
                          className="object-contain"
                        />
                      </div>

                      <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        Hi! I&apos;m RitzBOT! <br />A fully-homemade AI
                        Assistant.
                      </h2>

                      <p className="text-gray-600 leading-relaxed">
                        What can I help you with today?
                      </p>

                      <div className="flex justify-center items-center gap-3 flex-wrap mt-4">
                        {btnsQue.length > 0 &&
                          btnsQue.map((btnMsg, idx) => (
                            <button
                              onClick={() => (
                                setMsg(btnMsg.msg),
                                setBtnsQue((pr) =>
                                  pr.filter((ob) => ob.id !== btnMsg.id)
                                )
                              )}
                              key={idx}
                              className="px-4 cursor-pointer py-2 bg-white border border-gray-300 text-gray-700 rounded-full shadow-sm hover:bg-gray-100 hover:border-gray-400 transition-colors duration-200 text-sm"
                            >
                              {btnMsg.msg}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    ref={chatReff}
                    className={`${styles.chatUiScrollBar} w-full chatUiScrollBar pt-2 max-h-[75%] overflow-y-auto msgContainer absolute top-16 flex flex-col gap-4 px-4`}
                  >
                    {msgsQue.length > 0 &&
                      msgsQue.map((dt, idx) => (
                        <div
                          dangerouslySetInnerHTML={{ __html: dt.msg }}
                          key={idx}
                          className={`max-w-[70%] px-4 py-2 rounded-lg mb-3 shadow-sm text-sm ${
                            idx % 2 === 0
                              ? "self-end bg-gray-100 text-gray-800" // left side (other user)
                              : "self-start bg-blue-500 text-white" // right side (me)
                          }`}
                        ></div>
                      ))}

                    {/* Loader when bot is responding */}
                    {resLoader && (
                      <div className={`${styles.botMsg} ${styles.loader}`}>
                        <div className={styles.bounce}></div>
                        <div
                          className={`${styles.bounce} ${styles.delay1}`}
                        ></div>
                        <div
                          className={`${styles.bounce} ${styles.delay2}`}
                        ></div>
                        <span className={styles.typingText}>Processing...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* This is bottom of where user will send inputs  */}
                <div className="inputArea w-[95%] bg-white h-[4rem] relative overflow-hidden rounded-full">
                  <textarea
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault(); // prevent new line
                        chattingHandler();
                      }
                    }}
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    className="resize-none w-[95%]  h-full pt-5 pl-4 pr-8 focus:outline-none bg-white text-black"
                    placeholder="*Message"
                  ></textarea>

                  {/* Absolute Position Div  */}

                  <div className="absolute right-1 top-1/2 bg-[#353535] hover:bg-[#4f4d4d] cursor-pointer px-3 py-3 rounded-full -translate-y-1/2">
                    {/* Agar audiable ON hai → Pause icon */}
                    {isAudiable ? (
                      <Pause
                        onClick={() => setIsAudiable(false)}
                        className="text-white"
                      />
                    ) : msg !== "" ? (
                      <Send onClick={chattingHandler} className="text-white" />
                    ) : (
                      <Mic
                        onClick={() => setIsAudiable(true)}
                        className="text-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ChatBoat;
