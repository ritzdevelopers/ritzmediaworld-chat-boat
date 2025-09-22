"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, X, Scan, Pause } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./page.module.css";
import axios from "axios";
import Image from "next/image";
import countryCodeData from "../../country_code.json";

interface Country {
  name: string;
  code: string;
  dial_code: string;
}
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
  const [suggestionsQues, setSuggestionsQue] = useState<BTNSMSGS[]>([]);
  const [btnsQue, setBtnsQue] = useState<BTNSMSGS[]>([
    { id: 1, msg: "Digital Marketing" },
    { id: 2, msg: "Creative Solutions" },
    { id: 3, msg: "Print/Radio Advertising" },
    { id: 4, msg: "Web Design/Tech Solutions" },
    { id: 5, msg: "Generative AI Content" },
    { id: 6, msg: "AI Sales Avatar" },
  ]);
  const [resLoader, setResLoader] = useState(false);
  const chatReff = useRef<HTMLDivElement | null>(null);
  const [isAudiable, setIsAudiable] = useState(false);

  interface SUGGESTIONS {
    text: string;
  }
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
        "https://apis.contenaissance.com/api/v1/chat/v2",
        data,
        {
          headers: {
            "X-API-KEY":
              "26f8eb961b3d0b30a20b838cad928389aa38397695d78aa3f89f936903f42bce",
          },
        }
      );
      setResLoader(false);
      if (res.data.answer_html) {
        setSuggestionsQue([]);
        setMsgsQue((pr) => [
          ...pr,
          {
            msg: res.data.answer_html,
            id: pr.length > 0 ? pr[pr.length - 1].id + 1 : 1,
          },
        ]);
        res.data.suggestions &&
          res.data.suggestions.map((ob: string, idx: number) => {
            setSuggestionsQue((prev) => [...prev, { id: idx, msg: ob }]);
          });
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

  const suggestionsHandler = async (msg: string) => {
    if (!msg) return;
    setMsgsQue((pr) => [
      ...pr,
      { msg, id: pr.length > 0 ? pr[pr.length - 1].id + 1 : 1 },
    ]);

    try {
      setResLoader(true);
      const data = { session_id: sessionId, user_input: msg };
      const res = await axios.post(
        "https://apis.contenaissance.com/api/v1/chat/v2",
        data,
        {
          headers: {
            "X-API-KEY":
              "26f8eb961b3d0b30a20b838cad928389aa38397695d78aa3f89f936903f42bce",
          },
        }
      );
      setResLoader(false);
      if (res.data.answer_html) {
        setSuggestionsQue([]);
        setMsgsQue((pr) => [
          ...pr,
          {
            msg: res.data.answer_html,
            id: pr.length > 0 ? pr[pr.length - 1].id + 1 : 1,
          },
        ]);
        res.data.suggestions &&
          res.data.suggestions.map((ob: string, idx: number) => {
            setSuggestionsQue((prev) => [...prev, { id: idx, msg: ob }]);
          });
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

  const [openForm, setOpenForm] = useState(false);
  interface RESMODAL {
    status: number;
    msg: string;
  }
  // ------------------------- RENDER UI -------------------------
  const [username, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [message, setMessages] = useState<string>("");
  const [formLoader, setFormLoader] = useState<boolean>(false);
  const [countryCode, setCountryCode] = useState<string>("");
  const [modalMsg, setModalMessage] = useState<RESMODAL>({
    status: 200,
    msg: "",
  });
  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setFormLoader(true);
      const num = countryCode + phone;
      const res = await axios.post(
        "https://apis.contenaissance.com/api/v1/user/update",
        {
          session_id: sessionId,
          name: username,
          email: userEmail,
          phone: num,
          message,
        }
      );
      if (res.status === 200) {
        setModalMessage({
          status: 200,
          msg: "Form Submitted!",
        });
      }
      setFormLoader(false);
    } catch (error) {
      console.log(error);
      setFormLoader(false);
      setModalMessage({
        status: 500,
        msg: "Internal Server Error, Please Try Again",
      });
    }
  };

  const [search, setSearch] = useState("");

  // filter country codes based on search
  const filteredCountries = countryCodeData.filter(
    (dt) =>
      dt.name.toLowerCase().includes(search.toLowerCase()) ||
      dt.code.toLowerCase().includes(search.toLowerCase()) ||
      dt.dial_code.includes(search)
  );

  // Generative AI Content,
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
              className={`text-black ${styles.boatIcon}`}
              onClick={() => setIsOpen(false)} // ✅ close chat
            />
          ) : (
            <img
              src="/chat-icn-ui.png"
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
              <div
                className={`chatBotUi overflow-hidden  flex flex-col justify-between items-center  w-full h-full pb-4 ${styles.txtureClr}`}
              >
                {/* Chat Bot Header */}
                <div className="header w-full h-16 bg-white flex justify-between items-center px-6 border-b border-gray-300 shadow-sm">
                  {/* Left Section: Logo + Title */}
                  <div className="flex items-center gap-3">
                    <img
                      alt="RMW Chat Bot"
                      src="/chat-icn-ui.png"
                      className="w-10 h-10 object-contain"
                    />
                    <h2 className="text-xl font-semibold text-gray-900">
                      RitzBOT
                    </h2>
                  </div>

                  {/* Right Section: Scan Button (hidden on mobile) */}
                  <div className="flex justify-between items-center gap-4">
                    <button
                      onClick={() => setOpenForm((pr) => !pr)}
                      className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl font-semibold text-white shadow-lg
         bg-gradient-to-b from-[#9c6409] via-[#926e2b] to-[#aa7814]
         transform transition-transform duration-150 cursor-pointer hover:-translate-x-1 active:translate-y-0.5
         focus:outline-none focus-visible:ring-4 focus-visible:ring-[#DCA54F]/30 text-sm"
                    >
                      {openForm === true ? (
                        <>
                          Close Form <X></X>
                        </>
                      ) : (
                        <>
                          Get In Touch
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M5 12h14M13 5l7 7-7 7"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        </>
                      )}
                    </button>

                    {!mobileView && (
                      <Scan
                        onClick={() => setIsSmall((pr) => !pr)}
                        className="text-gray-900 cursor-pointer transition-transform duration-200 hover:text-gray-700 hover:scale-110"
                      />
                    )}
                  </div>
                </div>

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

                      <h2 className="text-2xl font-bold text-black mb-3">
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
                                suggestionsHandler(btnMsg.msg), setBtnsQue([])
                              )}
                              key={idx}
                              className="px-4 cursor-pointer py-2 bg-white border border-gray-300 text-black rounded-full shadow-sm hover:bg-gray-100 hover:border-gray-400 transition-colors duration-200 text-sm"
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
                    className={`${styles.chatUiScrollBar} w-full chatUiScrollBar pt-2 max-h-[75%] overflow-y-auto msgContainer absolute msgContainer  top-16 flex flex-col gap-4 px-4`}
                  >
                    {msgsQue.length > 0 &&
                      msgsQue.map((dt, idx) => (
                        <div
                          key={idx}
                          className={`max-w-[70%] px-4 py-2 mb-3 rounded-lg shadow-sm text-sm break-words whitespace-pre-wrap 
          ${
            idx % 2 === 0
              ? "self-end bg-gray-100 text-black"
              : "self-start bg-gray-200 text-black"
          } prose prose-sm`}
                          dangerouslySetInnerHTML={{ __html: dt.msg }}
                        />
                      ))}
                    {suggestionsQues.length > 0 &&
                      suggestionsQues.map((btnMsg, idx) => (
                        <button
                          onClick={() => (
                            suggestionsHandler(btnMsg.msg),
                            setSuggestionsQue([])
                          )}
                          key={idx}
                          className="px-4 cursor-pointer py-2 bg-white border border-gray-300 text-black rounded-full shadow-sm hover:bg-gray-100 hover:border-gray-400 transition-colors duration-200 text-sm"
                        >
                          {btnMsg.msg}
                        </button>
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
                      </div>
                    )}
                  </div>
                )}

                {/* This is bottom of where user will send inputs  */}
                <div className="inputArea w-[95%] bg-white h-[4rem] shadow-2xl relative overflow-hidden border border-gray-400 rounded-full">
                  <textarea
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !resLoader) {
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
                    ) : msg !== "" && !resLoader ? (
                      <Send onClick={chattingHandler} className="text-white" />
                    ) : (
                      <Mic
                        onClick={() => setIsAudiable(true)}
                        className="text-white"
                      />
                    )}
                  </div>
                </div>

                {openForm && (
                  <div className="frmModal h-full flex flex-col bg-white text-black absolute top-16 w-full">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="font-bold text-2xl ">
                        Please share your details:
                      </h2>
                      <p className="text-gray-500 text-sm">
                        Kindly provide your basic information so we can reach
                        out to you easily. Please ensure your email and phone
                        number are correct.
                      </p>
                    </div>

                    <form
                      onSubmit={submitForm}
                      className="w-full mx-auto p-6 shadow-lg rounded-xl  bg-white"
                    >
                      {modalMsg && (
                        <div
                          className={`text-center font-medium ${
                            modalMsg.status === 200
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          <p>{modalMsg.msg}</p>
                        </div>
                      )}

                      {/* Name */}
                      <input
                        required
                        onChange={(e) => setUserName(e.target.value)}
                        type="text"
                        name="name"
                        placeholder="Name*"
                        className="w-full p-3 border-b-2 border-[#AEAEAE] bg-[#FBFBFB] focus:outline-none focus:border-yellow-400 mb-4 text-black "
                      />

                      {/* Email */}
                      <input
                        required
                        onChange={(e) => setUserEmail(e.target.value)}
                        type="email"
                        name="email"
                        placeholder="Email*"
                        pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                        className="w-full p-3 border-b-2 border-[#AEAEAE] bg-[#FBFBFB] focus:outline-none focus:border-yellow-400 mb-4 text-black "
                      />

                      {/* Phone */}
                      <div className="flex gap-2 mb-4 -mt-8 items-end">
                        <div className="relative w-1/3">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full opacity-0 p-2 border-b-2 border-[#AEAEAE] bg-[#FBFBFB] focus:outline-none text-black rounded-t-md"
                          />
                          <select
                            required
                            name="countryCode"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-full p-3 border-b-2 border-[#AEAEAE] bg-[#FBFBFB] focus:outline-none text-black "
                          >
                            {filteredCountries.map((dt, idx) => (
                              <option key={idx} value={`+${dt.dial_code}`}>
                                {dt.dial_code} {dt.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          required
                          onChange={(e) => setPhone(e.target.value)}
                          type="tel"
                          name="phone"
                          placeholder="Phone*"
                          pattern="^[0-9]{7,14}$"
                          className="w-2/3 p-3 border-b-2 border-[#AEAEAE] bg-[#FBFBFB] h-[49px] focus:outline-none text-black "
                        />
                      </div>

                      {/* Message */}
                      <textarea
                        required
                        onChange={(e) => setMessages(e.target.value)}
                        name="message"
                        placeholder="Message*"
                        rows={4}
                        className="w-full resize-none p-3 border-b-2 border-[#AEAEAE] bg-[#FBFBFB] focus:outline-none mb-4 text-black "
                      />

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={formLoader}
                        className={`w-full flex justify-center items-center cursor-pointer py-3  text-white font-medium transition ${
                          formLoader
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-[#DCA54F] hover:bg-[#b9760c]"
                        }`}
                      >
                        {formLoader ? (
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            ></path>
                          </svg>
                        ) : (
                          "Submit"
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ChatBoat;
