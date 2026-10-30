(function () {
  'use strict';
  var LOCALES = [
    { code: 'zh-CN', label: '简体中文' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'en', label: 'English' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' }
  ];
  var D = {
    'zh-CN': {
      brand: '轻客服 SaaS', brandSub: '客服挂件 · 线索 CRM', login: '登录工作台', register: '免费注册', freeRegister: '免费注册',
      bookDemo: '预约团队演示', backHome: '返回官网', already: '已有账号？', noAccount: '没有账号？',
      phone: '手机号', phonePlaceholder: '请输入 11 位手机号', code: '验证码', codePlaceholder: '6 位短信验证码',
      password: '设置密码', passwordPlaceholder: '至少 6 位，用于登录后台', agree: '我已阅读并同意',
      privacy: '隐私政策', terms: '服务条款', submitRegister: '注册并进入后台', sendCode: '获取验证码',
      loginHint: '已经有账号？', directLogin: '直接登录', signupTitle: '创建账号',
      signupSub: '手机号用于登录和接收接入提醒，不会对外展示。',
      signupHero: '注册一个账号<br>把<span>自己的网站</span>接进来',
      signupSubHero: '注册只需要手机号和密码。进入后台后添加你的网站，复制一段 JS 放到自己的页面，真实访客就能看到客服挂件、行为轨迹和线索表单。',
      signupB1: '注册只要 30 秒', signupB1d: '手机号、验证码、密码，不询问网站信息，不阻断注册。',
      signupB2: '后台添加自己的网站', signupB2d: '登录后添加域名、生成加载令牌，自己控制站点。',
      signupB3: '直接跑真实场景', signupB3d: '把 JS 放到自己的网站，访客咨询、轨迹和线索实时进入后台。',
      signupIntroNote: '轻客服 SaaS · 个人网站和应用不需要复杂流程，快速接入。', signupTeamCta: '需要私有化或团队版？可以预约顾问 →',
      signupQuote: '“个人站长需要的是一段能马上跑起来的代码，不是一套复杂的开通流程。”',
      signupQuoteBy: '轻客服 SaaS · 为个人网站和小团队设计', teamDemo: '需要团队演示或私有化？', bookAdvisor: '预约顾问',
      signupTrust1: '注册后添加自己的网站', signupTrust2: '数据按工作空间隔离', signupTrust3: '可随时导出线索',
      navProduct: '产品', navCapabilities: '能力', navPricing: '价格', navGuide: '接入', navFaq: '常见问题', navDemo: '在线演示',
      heroBadge: '新版本 · 全链路增长分析 3.0', heroTitle: '客服挂件接住访客<br><span>线索 CRM 沉淀商机</span>',
      heroSub: '一段客服挂件接入网站，实时接待访客、记录行为轨迹、主动触达，再把咨询沉淀为线索，进入线索 CRM 跟进成交。',
      heroCta: '免费注册，快速接入', heroDemo: '预约团队演示',
      heroNote: '个人站长可直接注册；团队/企业可预约顾问演示。右下角挂件就是真实产品。',
      pathKicker: '两种开始方式', pathTitle: '自己接入，或让顾问带你接入',
      pathSub: '同一套产品，两种服务方式。个人网站和小团队可以自己跑通，团队采购可以预约演示。',
      pathSelfTag: '个人站长 / 独立开发者', pathSelfTitle: '免费注册，马上看到效果',
      pathSelfDesc: '注册后进入后台添加自己的网站，复制一段 JS 放到页面即可。访客咨询、轨迹和线索都来自你的真实场景，不需要额外演示站。',
      pathSelfCta: '免费注册', pathTeamTag: '团队 / 企业', pathTeamTitle: '预约演示，按团队方案接入',
      pathTeamDesc: '适合多站点、客服团队、外贸独立站和需要合同/发票的客户。顾问会用你的网站做一次真实接入演示，再确定套餐与权限。',
      pathTeamCta: '预约 20 分钟演示', pricingTitle: '先免费验证，再为增长付费',
      pricingSub: '所有付费套餐均含无限访客、HTTPS、数据隔离与行为采集开关，年付按 10 个月计费。',
      trialKicker: '团队 / 企业通道', trialTitle: '让顾问带你做一次<br>真实接入演示',
      trialSub: '提交信息后，顾问会带着你的网站做一次真实接入演示。想自己先研究，可以直接免费注册。',
      trialPoint1: '14 天全功能试用', trialPoint2: '免费接入辅导', trialPoint3: '随时降级免费版',
      trialLogin: '或直接免费注册，自己接入 →', trialSubmit: '预约演示', footerRights: '© 2026 轻客服 SaaS · 客服挂件接住访客，线索 CRM 沉淀商机',
      footerSecurity: '数据隔离 · 追踪开关 · 广告拦截上报', referral: '推广计划',
      dashboard: '数据概览', onboarding: '接入向导', referralCenter: '推广中心', conversations: '会话接待', visitors: '访客档案',
      leads: '线索 CRM', reports: '数据报表', automation: '自动化规则', knowledge: '知识库', ai: 'AI 接待',
      widget: '挂件配置', sites: '站点管理', forms: '表单配置', team: '团队与权限', billing: '套餐与用量',
      settings: '系统设置', notifications: '消息通知', support: '帮助与工单', logs: '操作日志',
      workspace: '工作台', growth: '增长与转化', siteConfig: '站点配置', system: '系统', allSites: '全部站点',
      profile: '个人资料', passwordChange: '修改密码', logout: '退出登录', nickname: '昵称', chooseAvatar: '选择头像', saveProfile: '保存资料',
      referralLink: '专属邀请链接', copyLink: '复制邀请链接', referralRules: '推广规则', withdraw: '申请提现', available: '可提现',
      pending: '待结算', totalReward: '累计奖励', paidCustomers: '付费客户', referrals: '邀请记录', rewards: '奖励记录', withdrawals: '提现记录'
    },
    'zh-TW': {
      brand: '輕客服 SaaS', brandSub: '客服掛件 · 線索 CRM', login: '登入工作台', register: '免費註冊', freeRegister: '免費註冊',
      bookDemo: '預約團隊演示', backHome: '返回官網', already: '已有帳號？', noAccount: '沒有帳號？',
      phone: '手機號', phonePlaceholder: '請輸入 11 位手機號', code: '驗證碼', codePlaceholder: '6 位簡訊驗證碼',
      password: '設定密碼', passwordPlaceholder: '至少 6 位，用於登入後台', agree: '我已閱讀並同意',
      privacy: '隱私政策', terms: '服務條款', submitRegister: '註冊並進入後台', sendCode: '取得驗證碼',
      loginHint: '已經有帳號？', directLogin: '直接登入', signupTitle: '建立帳號',
      signupSub: '手機號用於登入和接收接入提醒，不會對外展示。',
      signupHero: '註冊一個帳號<br>把<span>自己的網站</span>接進來',
      signupSubHero: '註冊只需要手機號和密碼。進入後台後新增你的網站，複製一段 JS 放到自己的頁面，真實訪客就能看到客服掛件、行為軌跡和線索表單。',
      signupB1: '註冊只要 30 秒', signupB1d: '手機號、驗證碼、密碼，不詢問網站資訊，不阻斷註冊。',
      signupB2: '後台新增自己的網站', signupB2d: '登入後新增網域、生成載入令牌，自己控制站點。',
      signupB3: '直接跑真實場景', signupB3d: '把 JS 放到自己的網站，訪客諮詢、軌跡和線索即時進入後台。',
      signupIntroNote: '輕客服 SaaS · 個人網站和應用不需要複雜流程，快速接入。', signupTeamCta: '需要私有化或團隊版？可以預約顧問 →',
      signupQuote: '「個人站長需要的是一段能馬上跑起來的程式碼，不是一套複雜的開通流程。」',
      signupQuoteBy: '輕客服 SaaS · 為個人網站和小團隊設計', teamDemo: '需要團隊演示或私有化？', bookAdvisor: '預約顧問',
      signupTrust1: '註冊後新增自己的網站', signupTrust2: '資料按工作空間隔離', signupTrust3: '可隨時匯出線索',
      navProduct: '產品', navCapabilities: '能力', navPricing: '價格', navGuide: '接入', navFaq: '常見問題', navDemo: '線上演示',
      heroBadge: '新版本 · 全鏈路增長分析 3.0', heroTitle: '客服掛件接住訪客<br><span>線索 CRM 沉澱商機</span>',
      heroSub: '一段客服掛件接入網站，即時接待訪客、記錄行為軌跡、主動觸達，再把諮詢沉澱為線索，進入線索 CRM 跟進成交。',
      heroCta: '免費註冊，快速接入', heroDemo: '預約團隊演示',
      heroNote: '個人站長可直接註冊；團隊/企業可預約顧問演示。右下角掛件就是真實產品。',
      pathKicker: '兩種開始方式', pathTitle: '自己接入，或讓顧問帶你接入',
      pathSub: '同一套產品，兩種服務方式。個人網站和小團隊可以自己跑通，團隊採購可以預約演示。',
      pathSelfTag: '個人站長 / 獨立開發者', pathSelfTitle: '免費註冊，馬上看到效果',
      pathSelfDesc: '註冊後進入後台新增自己的網站，複製一段 JS 放到頁面即可。訪客諮詢、軌跡和線索都來自你的真實場景，不需要額外演示站。',
      pathSelfCta: '免費註冊', pathTeamTag: '團隊 / 企業', pathTeamTitle: '預約演示，按團隊方案接入',
      pathTeamDesc: '適合多站點、客服團隊、外貿獨立站和需要合約/發票的客戶。顧問會用你的網站做一次真實接入演示，再確定方案與權限。',
      pathTeamCta: '預約 20 分鐘演示', pricingTitle: '先免費驗證，再為增長付費',
      pricingSub: '所有付費方案均含無限訪客、HTTPS、資料隔離與行為採集開關。年付按 10 個月計費。',
      trialKicker: '團隊 / 企業通道', trialTitle: '讓顧問帶你做一次<br>真實接入演示',
      trialSub: '提交資訊後，顧問會帶著你的網站做一次真實接入演示。想自己先研究，可以直接免費註冊。',
      trialPoint1: '14 天全功能試用', trialPoint2: '免費接入輔導', trialPoint3: '隨時降級免費版',
      trialLogin: '或直接免費註冊，自己接入 →', trialSubmit: '預約演示', footerRights: '© 2026 輕客服 SaaS · 客服掛件接住訪客，線索 CRM 沉澱商機',
      footerSecurity: '資料隔離 · 追蹤開關 · 廣告攔截上報', referral: '推廣計畫',
      dashboard: '資料概覽', onboarding: '接入向導', referralCenter: '推廣中心', conversations: '會話接待', visitors: '訪客檔案',
      leads: '線索 CRM', reports: '資料報表', automation: '自動化規則', knowledge: '知識庫', ai: 'AI 接待',
      widget: '掛件設定', sites: '站點管理', forms: '表單設定', team: '團隊與權限', billing: '方案與用量',
      settings: '系統設定', notifications: '訊息通知', support: '幫助與工單', logs: '操作日誌',
      workspace: '工作台', growth: '增長與轉化', siteConfig: '站點設定', system: '系統', allSites: '全部站點',
      profile: '個人資料', passwordChange: '修改密碼', logout: '登出', nickname: '暱稱', chooseAvatar: '選擇頭像', saveProfile: '儲存資料',
      referralLink: '專屬邀請連結', copyLink: '複製邀請連結', referralRules: '推廣規則', withdraw: '申請提現', available: '可提現',
      pending: '待結算', totalReward: '累計獎勵', paidCustomers: '付費客戶', referrals: '邀請記錄', rewards: '獎勵記錄', withdrawals: '提現記錄'
    },
    en: {
      brand: 'Qingke SaaS', brandSub: 'Support widget · Lead CRM', login: 'Sign in', register: 'Sign up free', freeRegister: 'Sign up free',
      bookDemo: 'Book a demo', backHome: 'Back to home', already: 'Already have an account?', noAccount: 'Need an account?',
      phone: 'Phone', phonePlaceholder: 'Enter your phone number', code: 'Verification code', codePlaceholder: '6-digit code',
      password: 'Password', passwordPlaceholder: 'At least 6 characters', agree: 'I agree to the',
      privacy: 'Privacy Policy', terms: 'Terms of Service', submitRegister: 'Create account', sendCode: 'Send code',
      loginHint: 'Already have an account?', directLogin: 'Sign in', signupTitle: 'Create your account',
      signupSub: 'Your phone is used for sign-in and setup reminders. It will not be shown publicly.',
      signupHero: 'Create an account<br>and connect <span>your own site</span>',
      signupSubHero: 'Sign-up takes only a phone number and password. Add your website in the dashboard, paste one script into your page, and real visitors can start chatting.',
      signupB1: 'Sign up in 30 seconds', signupB1d: 'Phone, code and password. No website questions during sign-up.',
      signupB2: 'Add your own website', signupB2d: 'Add a domain and generate your loader token from the dashboard.',
      signupB3: 'Run real scenarios', signupB3d: 'Install the script on your site and see real chats, journeys and leads in the dashboard.',
      signupIntroNote: 'Qingke SaaS · Personal sites and apps can get started fast without a complex process.', signupTeamCta: 'Need private deployment or a team plan? Talk to an advisor →',
      signupQuote: '“Site owners need a snippet that works right away, not a complicated onboarding process.”',
      signupQuoteBy: 'Qingke SaaS · Built for sites and small teams', teamDemo: 'Need a team demo or private deployment?', bookAdvisor: 'Talk to us',
      signupTrust1: 'Add your site after sign-up', signupTrust2: 'Data isolated by workspace', signupTrust3: 'Export leads anytime',
      navProduct: 'Product', navCapabilities: 'Capabilities', navPricing: 'Pricing', navGuide: 'Setup', navFaq: 'FAQ', navDemo: 'Live demo',
      heroBadge: 'New · Full-funnel growth analytics 3.0', heroTitle: 'A support widget that catches visitors<br><span>a lead CRM that turns them into pipeline</span>',
      heroSub: 'Add one support widget to your site. Chat with visitors, capture behavior, trigger proactive messages, and turn every conversation into a lead in your CRM.',
      heroCta: 'Sign up free, set up fast', heroDemo: 'Book a team demo',
      heroNote: 'Site owners can sign up directly. Teams can book a guided demo. The widget on the right is the real product.',
      pathKicker: 'Two ways to start', pathTitle: 'Set it up yourself, or let us guide you',
      pathSub: 'One product, two service paths. Site owners can go self-serve; teams can book a demo.',
      pathSelfTag: 'Site owners / indie makers', pathSelfTitle: 'Sign up free and see it work',
      pathSelfDesc: 'Add your website in the dashboard and paste one script. Real visitors, journeys and leads come from your own site.',
      pathSelfCta: 'Sign up free', pathTeamTag: 'Teams / business', pathTeamTitle: 'Book a demo and roll out with a plan',
      pathTeamDesc: 'For multi-site teams, customer support teams, cross-border stores and customers needing contracts and invoices. We will demo a real setup on your site.',
      pathTeamCta: 'Book a 20-minute demo', pricingTitle: 'Validate for free, pay when you grow',
      pricingSub: 'Every paid plan includes unlimited visitors, HTTPS, data isolation and a tracking switch. Annual billing is priced for 10 months.',
      trialKicker: 'Teams / business', trialTitle: 'Let us walk you through<br>a real setup',
      trialSub: 'Submit your details and we will run a real setup demo with your site. Prefer to explore on your own? Sign up free.',
      trialPoint1: '14-day full-feature trial', trialPoint2: 'Free setup support', trialPoint3: 'Downgrade anytime',
      trialLogin: 'Or sign up free and set it up yourself →', trialSubmit: 'Book a demo', footerRights: '© 2026 Qingke SaaS · Support widget catches visitors, Lead CRM turns them into pipeline',
      footerSecurity: 'Data isolation · Tracking switch · Ad-block reporting', referral: 'Referral program',
      dashboard: 'Overview', onboarding: 'Setup guide', referralCenter: 'Referral center', conversations: 'Inbox', visitors: 'Visitors',
      leads: 'Leads', reports: 'Reports', automation: 'Automation', knowledge: 'Knowledge base', ai: 'AI assistant',
      widget: 'Widget settings', sites: 'Websites', forms: 'Forms', team: 'Team & roles', billing: 'Plan & usage',
      settings: 'Settings', notifications: 'Notifications', support: 'Support', logs: 'Audit log',
      workspace: 'Workspace', growth: 'Growth', siteConfig: 'Website setup', system: 'System', allSites: 'All websites',
      profile: 'Profile', passwordChange: 'Change password', logout: 'Sign out', nickname: 'Nickname', chooseAvatar: 'Choose avatar', saveProfile: 'Save profile',
      referralLink: 'Your referral link', copyLink: 'Copy link', referralRules: 'Program rules', withdraw: 'Request payout', available: 'Available',
      pending: 'Pending', totalReward: 'Total rewards', paidCustomers: 'Paid customers', referrals: 'Referrals', rewards: 'Rewards', withdrawals: 'Payouts'
    },
    ja: {
      brand: 'Qingke SaaS', brandSub: 'サポートウィジェット · リード CRM', login: 'ログイン', register: '無料登録', freeRegister: '無料登録',
      bookDemo: 'チームデモを予約', backHome: 'サイトへ戻る', already: 'アカウントをお持ちですか？', noAccount: 'アカウントが必要ですか？',
      phone: '電話番号', phonePlaceholder: '電話番号を入力', code: '認証コード', codePlaceholder: '6桁のコード',
      password: 'パスワード', passwordPlaceholder: '6文字以上', agree: '以下に同意します',
      privacy: 'プライバシーポリシー', terms: '利用規約', submitRegister: 'アカウントを作成', sendCode: 'コードを送信',
      loginHint: 'すでにアカウントをお持ちですか？', directLogin: 'ログイン', signupTitle: 'アカウント作成',
      signupSub: '電話番号はログインと設定通知にのみ使用され、公開されません。',
      signupHero: 'アカウントを作成し<br><span>自分のサイト</span>をつなぐ',
      signupSubHero: '登録は電話番号とパスワードだけ。管理画面でサイトを追加し、1 行のスクリプトを貼り付けると、実際の訪問者と会話できます。',
      signupB1: '30秒で登録', signupB1d: '電話番号、認証コード、パスワードのみ。サイト情報は登録時に聞きません。',
      signupB2: '自分のサイトを追加', signupB2d: '管理画面でドメインを追加し、ローダートークンを生成します。',
      signupB3: '実際の環境で運用', signupB3d: '自分のサイトに JS を設置すると、会話・行動・リードが管理画面に届きます。',
      signupIntroNote: 'Qingke SaaS · 個人サイトやアプリは複雑な手続きなしですぐに導入できます。', signupTeamCta: 'プライベート導入やチーム版が必要ですか？アドバイザーに相談 →',
      signupQuote: '「個人サイトに必要なのは、すぐ動くコードであり、複雑な開通手続きではありません。」',
      signupQuoteBy: 'Qingke SaaS · 個人サイトと小規模チーム向け', teamDemo: 'チームデモやプライベート導入をご希望ですか？', bookAdvisor: '相談する',
      signupTrust1: '登録後に自分のサイトを追加', signupTrust2: 'ワークスペースごとにデータ分離', signupTrust3: 'リードはいつでも出力可能',
      navProduct: '製品', navCapabilities: '機能', navPricing: '料金', navGuide: '導入', navFaq: 'FAQ', navDemo: 'デモ',
      heroBadge: '新版本 · フルファネル成長分析 3.0', heroTitle: 'サポートウィジェットが訪問者を受け止め<br><span>リード CRM が商機につなげる</span>',
      heroSub: '1 つのサポートウィジェットをサイトに追加。会話・行動・主動メッセージを記録し、相談をリードとして CRM で育成します。',
      heroCta: '無料登録ですぐ導入', heroDemo: 'チームデモを予約',
      heroNote: '個人サイトは直接登録できます。チームは相談デモを予約できます。右下のウィジェットは実際の製品です。',
      pathKicker: '2つの始め方', pathTitle: '自分で導入する、または専門家と進める',
      pathSub: '同じ製品を2つのサービス方法で。個人サイトはセルフサービス、チームはデモを予約できます。',
      pathSelfTag: '個人サイト / 個人開発者', pathSelfTitle: '無料登録ですぐ効果を確認',
      pathSelfDesc: '登録後に管理画面でサイトを追加し、1 行の JS を貼り付けるだけ。実際の訪問者・行動・リードが自分のサイトから届きます。',
      pathSelfCta: '無料登録', pathTeamTag: 'チーム / 企業', pathTeamTitle: 'デモを予約してチーム導入',
      pathTeamDesc: '複数サイト、サポートチーム、越境 EC、契約・請求書が必要な企業向け。実際のサイトで導入デモを行い、プランを決めます。',
      pathTeamCta: '20分のデモを予約', pricingTitle: 'まず無料で検証、成長してから課金',
      pricingSub: '有料プランには無制限の訪問者、HTTPS、データ分離、行動収集スイッチが含まれます。年払いは10か月分の料金です。',
      trialKicker: 'チーム / 企業', trialTitle: '実際の導入を<br>一緒に進めましょう',
      trialSub: '情報を送信すると、実際のサイトで導入デモを行います。まず自分で試す場合は無料登録できます。',
      trialPoint1: '14日間すべての機能を試用', trialPoint2: '無料の導入サポート', trialPoint3: 'いつでも無料プランへ',
      trialLogin: 'または無料登録して自分で導入 →', trialSubmit: 'デモを予約', footerRights: '© 2026 Qingke SaaS · サポートウィジェットとリード CRM',
      footerSecurity: 'データ分離 · 追跡スイッチ · 広告ブロック報告', referral: '紹介プログラム',
      dashboard: '概要', onboarding: '導入ガイド', referralCenter: '紹介センター', conversations: '問い合わせ', visitors: '訪問者',
      leads: 'リード', reports: 'レポート', automation: '自動化', knowledge: 'ナレッジ', ai: 'AI 受付',
      widget: 'ウィジェット設定', sites: 'サイト管理', forms: 'フォーム', team: 'チームと権限', billing: 'プランと使用量',
      settings: '設定', notifications: '通知', support: 'サポート', logs: '操作ログ',
      workspace: 'ワークスペース', growth: '成長', siteConfig: 'サイト設定', system: 'システム', allSites: 'すべてのサイト',
      profile: 'プロフィール', passwordChange: 'パスワード変更', logout: 'ログアウト', nickname: 'ニックネーム', chooseAvatar: 'アバターを選択', saveProfile: '保存',
      referralLink: '紹介リンク', copyLink: 'リンクをコピー', referralRules: 'プログラム規則', withdraw: '出金申請', available: '出金可能',
      pending: '保留中', totalReward: '累計報酬', paidCustomers: '有料顧客', referrals: '紹介履歴', rewards: '報酬履歴', withdrawals: '出金履歴'
    },
    ko: {
      brand: 'Qingke SaaS', brandSub: '상담 위젯 · 리드 CRM', login: '로그인', register: '무료 가입', freeRegister: '무료 가입',
      bookDemo: '팀 데모 예약', backHome: '홈으로', already: '이미 계정이 있나요?', noAccount: '계정이 필요하신가요?',
      phone: '전화번호', phonePlaceholder: '전화번호 입력', code: '인증 코드', codePlaceholder: '6자리 코드',
      password: '비밀번호', passwordPlaceholder: '6자 이상', agree: '다음에 동의합니다',
      privacy: '개인정보 처리방침', terms: '서비스 약관', submitRegister: '계정 만들기', sendCode: '인증번호 받기',
      loginHint: '이미 계정이 있나요?', directLogin: '로그인', signupTitle: '계정 만들기',
      signupSub: '전화번호는 로그인과 설정 알림에만 사용되며 공개되지 않습니다.',
      signupHero: '계정을 만들고<br><span>내 사이트</span>를 연결하세요',
      signupSubHero: '가입에는 전화번호와 비밀번호만 필요합니다. 대시보드에서 사이트를 추가하고 스크립트 한 줄을 붙이면 실제 방문자와 상담할 수 있습니다.',
      signupB1: '30초 가입', signupB1d: '전화번호, 인증번호, 비밀번호만 입력합니다. 가입 중 사이트 정보를 묻지 않습니다.',
      signupB2: '내 사이트 추가', signupB2d: '로그인 후 도메인과 로더 토큰을 직접 관리합니다.',
      signupB3: '실제 환경에서 운영', signupB3d: '내 사이트에 JS를 설치하면 상담, 행동, 리드가 대시보드에 들어옵니다.',
      signupIntroNote: 'Qingke SaaS · 개인 사이트와 앱은 복잡한 절차 없이 빠르게 시작할 수 있습니다.', signupTeamCta: '프라이빗 배포나 팀 플랜이 필요하신가요? 상담사에게 문의 →',
      signupQuote: '“개인 사이트 운영자에게 필요한 것은 복잡한 개통 절차가 아니라 바로 작동하는 코드입니다.”',
      signupQuoteBy: 'Qingke SaaS · 개인 사이트와 소규모 팀을 위해', teamDemo: '팀 데모나 프라이빗 배포가 필요하신가요?', bookAdvisor: '상담하기',
      signupTrust1: '가입 후 내 사이트 추가', signupTrust2: '워크스페이스별 데이터 분리', signupTrust3: '리드를 언제든 내보내기',
      navProduct: '제품', navCapabilities: '기능', navPricing: '가격', navGuide: '설치', navFaq: 'FAQ', navDemo: '데모',
      heroBadge: '신규 · 전체 퍼널 성장 분석 3.0', heroTitle: '상담 위젯이 방문자를 맞이하고<br><span>리드 CRM이 기회로 바꿉니다</span>',
      heroSub: '상담 위젯 하나를 사이트에 추가하세요. 방문자 상담, 행동 기록, 선제적 메시지, 리드 CRM까지 하나로 이어집니다.',
      heroCta: '무료 가입, 빠른 설치', heroDemo: '팀 데모 예약',
      heroNote: '개인 사이트는 바로 가입할 수 있습니다. 팀은 가이드 데모를 예약할 수 있습니다. 오른쪽 위젯이 실제 제품입니다.',
      pathKicker: '두 가지 시작 방법', pathTitle: '직접 설치하거나 전문가와 함께',
      pathSub: '하나의 제품, 두 가지 서비스 방식. 개인 사이트는 셀프서비스, 팀은 데모 예약이 가능합니다.',
      pathSelfTag: '개인 사이트 / 인디 개발자', pathSelfTitle: '무료 가입 후 바로 확인',
      pathSelfDesc: '가입 후 대시보드에서 사이트를 추가하고 스크립트 한 줄을 붙이면 됩니다. 실제 방문자, 행동, 리드가 내 사이트에서 들어옵니다.',
      pathSelfCta: '무료 가입', pathTeamTag: '팀 / 기업', pathTeamTitle: '데모 예약 후 팀 단위 도입',
      pathTeamDesc: '다중 사이트, 상담팀, 크로스보더 스토어, 계약과 인보이스가 필요한 기업에 적합합니다. 실제 사이트로 도입 데모를 진행합니다.',
      pathTeamCta: '20분 데모 예약', pricingTitle: '무료로 검증하고 성장 후 결제',
      pricingSub: '모든 유료 플랜에는 무제한 방문자, HTTPS, 데이터 분리, 행동 수집 스위치가 포함됩니다. 연간 결제는 10개월 요금입니다.',
      trialKicker: '팀 / 기업', trialTitle: '실제 도입을<br>함께 진행하세요',
      trialSub: '정보를 제출하면 실제 사이트로 도입 데모를 진행합니다. 먼저 직접 사용해 보려면 무료 가입이 가능합니다.',
      trialPoint1: '14일 전체 기능 체험', trialPoint2: '무료 도입 지원', trialPoint3: '언제든 무료 플랜으로',
      trialLogin: '또는 무료 가입 후 직접 설치 →', trialSubmit: '데모 예약', footerRights: '© 2026 Qingke SaaS · 상담 위젯과 리드 CRM',
      footerSecurity: '데이터 분리 · 추적 스위치 · 광고 차단 리포트', referral: '추천 프로그램',
      dashboard: '개요', onboarding: '설치 가이드', referralCenter: '추천 센터', conversations: '상담', visitors: '방문자',
      leads: '리드', reports: '리포트', automation: '자동화', knowledge: '지식 베이스', ai: 'AI 상담',
      widget: '위젯 설정', sites: '사이트 관리', forms: '폼', team: '팀 및 권한', billing: '플랜 및 사용량',
      settings: '설정', notifications: '알림', support: '지원', logs: '감사 로그',
      workspace: '워크스페이스', growth: '성장', siteConfig: '사이트 설정', system: '시스템', allSites: '전체 사이트',
      profile: '프로필', passwordChange: '비밀번호 변경', logout: '로그아웃', nickname: '닉네임', chooseAvatar: '아바타 선택', saveProfile: '저장',
      referralLink: '추천 링크', copyLink: '링크 복사', referralRules: '프로그램 규칙', withdraw: '출금 신청', available: '출금 가능',
      pending: '정산 대기', totalReward: '누적 보상', paidCustomers: '유료 고객', referrals: '추천 내역', rewards: '보상 내역', withdrawals: '출금 내역'
    }
  };

  var EXTRA = {
    'zh-CN': { '手机号或邮箱': '手机号或邮箱', '手机号 / you@company.com': '手机号 / you@company.com', '密码': '密码', '请输入密码': '请输入密码', '进入工作台': '进入工作台', '使用团队账号登录，或使用下方演示账号快速体验。': '使用团队账号登录，或使用下方演示账号快速体验。', '平台运营账号请前往': '平台运营账号请前往', '运营后台': '运营后台', '免费注册 · 14 天专业版试用': '免费注册 · 14 天专业版试用', '与': '与' },
    'zh-TW': { '手机号或邮箱': '手機號或信箱', '手机号 / you@company.com': '手機號 / you@company.com', '密码': '密碼', '请输入密码': '請輸入密碼', '进入工作台': '進入工作台', '使用团队账号登录，或使用下方演示账号快速体验。': '使用團隊帳號登入，或使用下方演示帳號快速體驗。', '平台运营账号请前往': '平台運營帳號請前往', '运营后台': '運營後台', '免费注册 · 14 天专业版试用': '免費註冊 · 14 天專業版試用', '与': '與' },
    en: { '手机号或邮箱': 'Phone or email', '手机号 / you@company.com': 'Phone / you@company.com', '密码': 'Password', '请输入密码': 'Enter password', '进入工作台': 'Enter dashboard', '使用团队账号登录，或使用下方演示账号快速体验。': 'Sign in with your team account, or use a demo account below.', '平台运营账号请前往': 'Platform accounts should use', '运营后台': 'Ops console', '免费注册 · 14 天专业版试用': 'Free sign-up · 14-day Pro trial', '与': 'and' },
    ja: { '手机号或邮箱': '電話番号またはメール', '手机号 / you@company.com': '電話番号 / you@company.com', '密码': 'パスワード', '请输入密码': 'パスワードを入力', '进入工作台': 'ダッシュボードへ', '使用团队账号登录，或使用下方演示账号快速体验。': 'チームアカウントでログインするか、下のデモアカウントをご利用ください。', '平台运营账号请前往': '運営アカウントは', '运营后台': '運営コンソール', '免费注册 · 14 天专业版试用': '無料登録 · 14日間プロ版トライアル', '与': 'および' },
    ko: { '手机号或邮箱': '전화번호 또는 이메일', '手机号 / you@company.com': '전화번호 / you@company.com', '密码': '비밀번호', '请输入密码': '비밀번호 입력', '进入工作台': '대시보드 입장', '使用团队账号登录，或使用下方演示账号快速体验。': '팀 계정으로 로그인하거나 아래 데모 계정을 사용하세요.', '平台运营账号请前往': '플랫폼 계정은', '运营后台': '운영 콘솔', '免费注册 · 14 天专业版试用': '무료 가입 · 14일 프로 체험', '与': '및' }
  };
  Object.keys(EXTRA).forEach(function (l) { Object.assign(D[l], EXTRA[l]); });

  var LOGIN_DESIGN = {
    'zh-CN': {
      '登录工作台': '登录工作台',
      '客服挂件接住访客，': '客服挂件接住访客，',
      '线索 CRM 沉淀商机': '线索 CRM 沉淀商机',
      '从访客接入到商机沉淀，一站式提升转化': '从访客接入到商机沉淀，一站式提升转化',
      '使用注册账号或团队账号登录，也可点击演示账号快速体验。': '使用注册账号或团队账号登录，也可点击演示账号快速体验。',
      '在线接待': '在线接待', '线索沉淀': '线索沉淀', '数据复盘': '数据复盘',
      '一段客服挂件接入网站，实时接待、记录行为、主动触达，再把咨询沉淀为线索，进入线索 CRM 跟进成交。': '一段客服挂件接入网站，实时接待、记录行为、主动触达，再把咨询沉淀为线索，进入线索 CRM 跟进成交。',
      '异步懒加载，不阻塞宿主网站首屏': '异步懒加载，不阻塞宿主网站首屏',
      '实时聊天 + 无埋点行为采集 + 意向打分': '实时聊天 + 无埋点行为采集 + 意向打分',
      '多租户数据隔离，RBAC 权限体系': '多租户数据隔离，RBAC 权限体系',
      '客户工作台': '客户工作台',
      '客服挂件接住访客，线索CRM沉淀商机': '客服挂件接住访客，线索CRM沉淀商机',
      '你正在通过好友邀请注册，首单付费后邀请人将获得推广奖励。': '你正在通过好友邀请注册，首单付费后邀请人将获得推广奖励。',
      '注册一个账号': '注册一个账号', '把自己的网站接进来': '把自己的网站接进来',
      '管理员 · 林晓': '管理员 · 林晓', '运营 · 周敏': '运营 · 周敏', '客服 · 陈曦': '客服 · 陈曦',
      '登录中...': '登录中...', '登录失败': '登录失败',
      '演示账号（点击自动登录）': '演示账号（点击自动登录）',
      '记住登录状态': '记住登录状态', '没有账号？': '没有账号？', '免费注册': '免费注册'
    },
    'zh-TW': {
      '登录工作台': '登入工作台',
      '客服挂件接住访客，': '客服掛件接住訪客，',
      '线索 CRM 沉淀商机': '線索 CRM 沉澱商機',
      '从访客接入到商机沉淀，一站式提升转化': '從訪客接入到商機沉澱，一站式提升轉化',
      '使用注册账号或团队账号登录，也可点击演示账号快速体验。': '使用註冊帳號或團隊帳號登入，也可點擊演示帳號快速體驗。',
      '在线接待': '線上接待', '线索沉淀': '線索沉澱', '数据复盘': '數據復盤',
      '一段客服挂件接入网站，实时接待、记录行为、主动触达，再把咨询沉淀为线索，进入线索 CRM 跟进成交。': '一段客服掛件接入網站，即時接待、記錄行為、主動觸達，再把諮詢沉澱為線索，進入線索 CRM 跟進成交。',
      '异步懒加载，不阻塞宿主网站首屏': '非同步懶載入，不阻塞宿主網站首屏',
      '实时聊天 + 无埋点行为采集 + 意向打分': '即時聊天 + 無埋點行為採集 + 意向評分',
      '多租户数据隔离，RBAC 权限体系': '多租戶資料隔離，RBAC 權限體系',
      '客户工作台': '客戶工作台',
      '客服挂件接住访客，线索CRM沉淀商机': '客服掛件接住訪客，線索CRM沉澱商機',
      '你正在通过好友邀请注册，首单付费后邀请人将获得推广奖励。': '你正在透過好友邀請註冊，首單付費後邀請人將獲得推廣獎勵。',
      '注册一个账号': '註冊一個帳號', '把自己的网站接进来': '把自己的網站接進來',
      '管理员 · 林晓': '管理員 · 林曉', '运营 · 周敏': '運營 · 周敏', '客服 · 陈曦': '客服 · 陳曦',
      '登录中...': '登入中...', '登录失败': '登入失敗',
      '演示账号（点击自动登录）': '演示帳號（點擊自動登入）',
      '记住登录状态': '記住登入狀態', '没有账号？': '沒有帳號？', '免费注册': '免費註冊'
    },
    en: {
      '登录工作台': 'Sign in to workspace',
      '客服挂件接住访客，': 'Catch every visitor,',
      '线索 CRM 沉淀商机': 'Turn chats into pipeline',
      '从访客接入到商机沉淀，一站式提升转化': 'From first visit to qualified opportunity, one flow to lift conversion',
      '使用注册账号或团队账号登录，也可点击演示账号快速体验。': 'Sign in with your registered or team account, or click a demo account below.',
      '在线接待': 'Live engagement', '线索沉淀': 'Lead capture', '数据复盘': 'Analytics review',
      '一段客服挂件接入网站，实时接待、记录行为、主动触达，再把咨询沉淀为线索，进入线索 CRM 跟进成交。': 'One support widget on your site: live chat, behavior capture, proactive outreach, and every conversation turned into a lead in your CRM.',
      '异步懒加载，不阻塞宿主网站首屏': 'Lazy-loaded async, never blocks your page render',
      '实时聊天 + 无埋点行为采集 + 意向打分': 'Live chat + no-tag behavior tracking + intent scoring',
      '多租户数据隔离，RBAC 权限体系': 'Multi-tenant data isolation with RBAC',
      '客户工作台': 'Client workspace',
      '客服挂件接住访客，线索CRM沉淀商机': 'Catch every visitor, turn chats into pipeline',
      '你正在通过好友邀请注册，首单付费后邀请人将获得推广奖励。': 'You are signing up via a friend’s invite. The inviter earns a reward after your first paid order.',
      '注册一个账号': 'Create an account', '把自己的网站接进来': 'Connect your own website',
      '管理员 · 林晓': 'Admin · Lin Xiao', '运营 · 周敏': 'Ops · Zhou Min', '客服 · 陈曦': 'Agent · Chen Xi',
      '登录中...': 'Signing in...', '登录失败': 'Sign-in failed',
      '演示账号（点击自动登录）': 'Demo accounts (click to sign in)',
      '记住登录状态': 'Keep me signed in', '没有账号？': 'No account?', '免费注册': 'Sign up free'
    },
    ja: {
      '登录工作台': 'ワークスペースにログイン',
      '客服挂件接住访客，': 'チャットで訪問者を逃さず、',
      '线索 CRM 沉淀商机': 'リードCRMで商機を蓄積',
      '从访客接入到商机沉淀，一站式提升转化': '訪問者の接客から商機化まで、ワンストップで成約率を向上',
      '使用注册账号或团队账号登录，也可点击演示账号快速体验。': '登録アカウントまたはチームアカウントでログインするか、デモアカウントをクリックしてお試しください。',
      '在线接待': 'オンライン接客', '线索沉淀': 'リード蓄積', '数据复盘': 'データ分析',
      '一段客服挂件接入网站，实时接待、记录行为、主动触达，再把咨询沉淀为线索，进入线索 CRM 跟进成交。': 'サイトに客服ウィジェットを一つ設置するだけ。リアルタイム接客・行動記録・主動メッセージ、そして相談をリードとして CRM で育成します。',
      '异步懒加载，不阻塞宿主网站首屏': '非同期で遅延読み込みされ、サイトの初期表示を妨げません',
      '实时聊天 + 无埋点行为采集 + 意向打分': 'リアルタイムチャット + タグ不要の行動収集 + 意向スコアリング',
      '多租户数据隔离，RBAC 权限体系': 'マルチテナントのデータ分離と RBAC 権限管理',
      '客户工作台': 'クライアントワークスペース',
      '客服挂件接住访客，线索CRM沉淀商机': 'チャットで訪問者を逃さず、リードCRMで商機を蓄積',
      '你正在通过好友邀请注册，首单付费后邀请人将获得推广奖励。': '友人の招待リンクから登録中です。初回の有料注文後に招待者へ報酬が付与されます。',
      '注册一个账号': 'アカウントを作成', '把自己的网站接进来': '自分のサイトをつなぎ込む',
      '管理员 · 林晓': '管理者 · 林暁', '运营 · 周敏': '運営 · 周敏', '客服 · 陈曦': 'サポート · 陳曦',
      '登录中...': 'ログイン中...', '登录失败': 'ログインに失敗しました',
      '演示账号（点击自动登录）': 'デモアカウント（クリックで自動ログイン）',
      '记住登录状态': 'ログイン状態を保持', '没有账号？': 'アカウントをお持ちでない方は？', '免费注册': '無料登録'
    },
    ko: {
      '登录工作台': '워크스페이스 로그인',
      '客服挂件接住访客，': '채팅 위젯으로 방문자를 붙잡고,',
      '线索 CRM 沉淀商机': '리드 CRM으로 기회를 쌓습니다',
      '从访客接入到商机沉淀，一站式提升转化': '방문자 응대부터 영업 기회까지, 전환을 한 번에 높이세요',
      '使用注册账号或团队账号登录，也可点击演示账号快速体验。': '등록 계정 또는 팀 계정으로 로그인하거나 데모 계정을 클릭해 빠르게 체험하세요.',
      '在线接待': '실시간 상담', '线索沉淀': '리드 확보', '数据复盘': '데이터 분석',
      '一段客服挂件接入网站，实时接待、记录行为、主动触达，再把咨询沉淀为线索，进入线索 CRM 跟进成交。': '사이트에 상담 위젯 하나만 추가하세요. 실시간 상담, 행동 기록, 선제 메시지, 그리고 상담을 리드로 전환해 CRM에서 관리합니다.',
      '异步懒加载，不阻塞宿主网站首屏': '비동기 지연 로딩으로 사이트 초기 표시를 방해하지 않습니다',
      '实时聊天 + 无埋点行为采集 + 意向打分': '실시간 채팅 + 태그 없는 행동 수집 + 의향 스코어링',
      '多租户数据隔离，RBAC 权限体系': '멀티테넌트 데이터 분리 및 RBAC 권한 체계',
      '客户工作台': '고객 워크스페이스',
      '客服挂件接住访客，线索CRM沉淀商机': '채팅 위젯으로 방문자를 붙잡고, 리드 CRM으로 기회를 쌓습니다',
      '你正在通过好友邀请注册，首单付费后邀请人将获得推广奖励。': '친구 초대로 가입 중입니다. 첫 유료 주문 후 초대자에게 리워드가 지급됩니다.',
      '注册一个账号': '계정 만들기', '把自己的网站接进来': '내 웹사이트 연결하기',
      '管理员 · 林晓': '관리자 · 린샤오', '运营 · 周敏': '운영 · 저우민', '客服 · 陈曦': '상담 · 천시',
      '登录中...': '로그인 중...', '登录失败': '로그인에 실패했습니다',
      '演示账号（点击自动登录）': '데모 계정 (클릭 시 자동 로그인)',
      '记住登录状态': '로그인 상태 유지', '没有账号？': '계정이 없으신가요?', '免费注册': '무료 가입'
    }
  };
  Object.keys(LOGIN_DESIGN).forEach(function (l) { Object.assign(D[l], LOGIN_DESIGN[l]); });


  var MODAL = {
    'zh-CN': { consultTitle: '预约顾问', consultSub: '留个联系方式，顾问会带着你的网站做一次真实接入演示。', consultName: '称呼', consultPhone: '手机号', consultCompany: '公司 / 团队', consultWebsite: '官网', consultNeed: '当前最想解决的问题', consultNeedPlaceholder: '请选择', consultSubmit: '提交预约', consultNote: '提交即表示同意我们通过电话或短信联系你。', consultSuccess: '预约已提交', consultSuccessDesc: '顾问会在 1 个工作日内联系你，确认演示时间。', consultClose: '关闭', consultNamePh: '怎么称呼你', consultPhonePh: '用于接收顾问联系', consultCompanyPh: '公司或团队名称' },
    'zh-TW': { consultTitle: '預約顧問', consultSub: '留下聯絡方式，顧問會帶著你的網站做一次真實接入演示。', consultName: '稱呼', consultPhone: '手機號', consultCompany: '公司 / 團隊', consultWebsite: '官網', consultNeed: '目前最想解決的問題', consultNeedPlaceholder: '請選擇', consultSubmit: '提交預約', consultNote: '提交即表示同意我們透過電話或簡訊聯繫你。', consultSuccess: '預約已提交', consultSuccessDesc: '顧問會在 1 個工作日內聯繫你，確認演示時間。', consultClose: '關閉', consultNamePh: '怎麼稱呼你', consultPhonePh: '用於接收顧問聯繫', consultCompanyPh: '公司或團隊名稱' },
    en: { consultTitle: 'Talk to an advisor', consultSub: 'Leave your contact details and we will run a real setup demo with your website.', consultName: 'Name', consultPhone: 'Phone', consultCompany: 'Company / team', consultWebsite: 'Website', consultNeed: 'What do you want to solve?', consultNeedPlaceholder: 'Select one', consultSubmit: 'Book a demo', consultNote: 'By submitting, you agree to be contacted by phone or message.', consultSuccess: 'Request received', consultSuccessDesc: 'An advisor will contact you within one business day to confirm the demo.', consultClose: 'Close', consultNamePh: 'What should we call you?', consultPhonePh: 'For advisor contact', consultCompanyPh: 'Company or team name' },
    ja: { consultTitle: '相談を予約', consultSub: '連絡先を入力してください。実際のサイトで導入デモを行います。', consultName: 'お名前', consultPhone: '電話番号', consultCompany: '会社 / チーム', consultWebsite: 'ウェブサイト', consultNeed: '解決したい課題', consultNeedPlaceholder: '選択してください', consultSubmit: 'デモを予約', consultNote: '送信により、電話またはメッセージでの連絡に同意したものとみなされます。', consultSuccess: '予約を受け付けました', consultSuccessDesc: '担当者より 1 営業日以内にご連絡し、デモ日程を確認します。', consultClose: '閉じる', consultNamePh: 'お名前', consultPhonePh: '担当者連絡用', consultCompanyPh: '会社名またはチーム名' },
    ko: { consultTitle: '상담 예약', consultSub: '연락처를 남겨주시면 실제 사이트로 도입 데모를 진행합니다.', consultName: '이름', consultPhone: '전화번호', consultCompany: '회사 / 팀', consultWebsite: '웹사이트', consultNeed: '해결하고 싶은 문제', consultNeedPlaceholder: '선택하세요', consultSubmit: '데모 예약', consultNote: '제출하면 전화 또는 메시지로 연락받는 것에 동의합니다.', consultSuccess: '예약이 접수되었습니다', consultSuccessDesc: '담당자가 영업일 기준 1일 이내에 연락드려 데모 일정을 확인합니다.', consultClose: '닫기', consultNamePh: '이름', consultPhonePh: '담당자 연락용', consultCompanyPh: '회사 또는 팀 이름' }
  };
  Object.keys(MODAL).forEach(function (l) { Object.assign(D[l], MODAL[l]); });

  var SOURCE = {};
  function buildSource() {
    var zh = D['zh-CN'];
    Object.keys(zh).forEach(function (k) { if (!SOURCE[zh[k]]) SOURCE[zh[k]] = k; });
    if (!SOURCE['个人资料']) SOURCE['个人资料'] = 'profile';
  }
  buildSource();
  function detect() {
    var saved = '';
    try { saved = localStorage.getItem('qz_locale') || ''; } catch (e) { }
    if (D[saved]) return saved;
    var nav = (navigator.language || 'zh-CN').toLowerCase();
    if (nav.indexOf('zh-tw') === 0 || nav.indexOf('zh-hk') === 0) return 'zh-TW';
    if (nav.indexOf('zh') === 0) return 'zh-CN';
    if (nav.indexOf('ja') === 0) return 'ja';
    if (nav.indexOf('ko') === 0) return 'ko';
    if (nav.indexOf('en') === 0) return 'en';
    return 'zh-CN';
  }
  var locale = detect();
  function t(key, fallback) {
    if (!key) return fallback || '';
    var dict = D[locale] || D['zh-CN'];
    if (dict[key]) return dict[key];
    var sourceKey = SOURCE[key];
    if (sourceKey && dict[sourceKey]) return dict[sourceKey];
    return fallback || key;
  }
  function setLocale(next, reload) {
    if (!D[next]) next = 'zh-CN';
    locale = next;
    try { localStorage.setItem('qz_locale', next); } catch (e) { }
    document.documentElement.lang = next;
    if (reload) location.reload();
  }
  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n'), el.textContent);
      if (val) el.textContent = val;
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n-html'), el.innerHTML);
      if (val) el.innerHTML = val;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n-placeholder'), el.getAttribute('placeholder') || '');
      if (val) el.setAttribute('placeholder', val);
    });
    root.querySelectorAll('[data-lang-select]').forEach(function (sel) {
      sel.value = locale;
      if (!sel.__i18nBound) {
        sel.__i18nBound = true;
        sel.addEventListener('change', function () { setLocale(sel.value, false); apply(document); });
      }
    });
    document.documentElement.lang = locale;
  }
  window.I18N = { locales: LOCALES, get locale() { return locale; }, t: t, setLocale: setLocale, apply: apply };
  document.addEventListener('DOMContentLoaded', function () { apply(document); });
})();
