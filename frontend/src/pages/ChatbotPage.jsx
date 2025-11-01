export function ChatbotPage() {
  return (
    <section className="page chatbot-page">
      <h2>Multilingual Chatbot</h2>
      <div className="chat-shell">
        <div className="chat-log">
          <div className="msg ai">नमस्ते! मैं कैसे मदद कर सकता/सकती हूँ?</div>
          <div className="msg user">Plan a 3-day food trip in Kolkata</div>
          <div className="msg ai">ঠিক আছে! আমি খাবারের জন্য সেরা স্থানের তালিকা করছি…</div>
        </div>
        <div className="chat-input-row">
          <input className="input" placeholder="Ask in Hindi, Bengali, English, or Tamil" />
          <button className="btn btn-primary">Send</button>
        </div>
      </div>
    </section>
  )
}


