// test-chatgpt.js
const API_KEY = "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";

async function testVideoScript() {
  console.log("📡 ChatGPT APIテスト開始...");
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "user", 
          content: `3分動画「モテる行動ランキングTOP10」のスクリプトを作成してください。

【条件】
- 各項目: 15秒で読める分量（30-40文字程度）  
- 構成: 導入（30秒）→ランキング（2分）→まとめ（30秒）
- 口調: YouTuber風で親しみやすく
- 視聴者: 20-30代男性

【フォーマット】
導入（30秒分）:
（導入文をここに）

第10位: タイトル
説明文（15秒分）

第9位: タイトル  
説明文（15秒分）

...（第1位まで続ける）

まとめ（30秒分）:
（まとめ文をここに）`
        }],
        max_tokens: 2500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
        
    // test-chatgpt.js の最後の部分だけ修正
    console.log(`📊 使用トークン: ${data.usage.total_tokens}`);

    // 正しい料金計算
    const inputCost = (data.usage.prompt_tokens * 0.00015) / 1000;
    const outputCost = (data.usage.completion_tokens * 0.0006) / 1000; 
    const totalCost = inputCost + outputCost;

    console.log(`💰 実際のコスト: $${totalCost.toFixed(6)} (約${(totalCost * 150).toFixed(2)}円)`);
    
  } catch (error) {
    console.error("❌ エラー発生:", error.message);
  }
}

testVideoScript();