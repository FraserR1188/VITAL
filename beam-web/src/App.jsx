import { useMemo, useState } from 'react'
import { categories, feedPosts, notifications, organisation, signedInUser, team } from './data/mockData'

const categoryMeta = {
  achievement: { icon: 'Award', accent: '#ffd166' },
  kindness: { icon: 'Heart', accent: '#ff6b9d' },
  personal: { icon: 'Spark', accent: '#a78bfa' },
  fitness: { icon: 'Pulse', accent: '#06d6a0' },
}

function App() {
  const [activeTab, setActiveTab] = useState('feed')
  const [activeCategory, setActiveCategory] = useState('all')
  const [composerStep, setComposerStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('achievement')

  const visiblePosts = useMemo(() => {
    if (activeCategory === 'all') {
      return feedPosts
    }

    return feedPosts.filter((post) => post.category === activeCategory)
  }, [activeCategory])

  return (
    <div className="app-shell">
      <section className="marketing-panel">
        <div className="brand-lockup">
          <span className="brand-pill">Beam MVP</span>
          <h1>Celebrate the people behind the work.</h1>
          <p>
            Responsive web-first prototype for the MMC pilot. Invite-only access, warm recognition,
            and a feed designed to feel human from day one.
          </p>
        </div>

        <div className="insight-grid">
          <article className="insight-card emphasis">
            <span className="eyebrow">First milestone</span>
            <strong>Stakeholder-ready social feed</strong>
            <p>Auth, organisation setup, and the core posting flow are all framed for an MMC pilot demo.</p>
          </article>
          <article className="insight-card">
            <span className="eyebrow">Organisation model</span>
            <strong>Invite-only by default</strong>
            <p>Users join an existing workspace with an invite code and stay inside their organisation feed.</p>
          </article>
          <article className="insight-card">
            <span className="eyebrow">Launch posture</span>
            <strong>Built for proof first</strong>
            <p>MMC is the test bed. Multi-company SaaS comes after validated product love and usage.</p>
          </article>
        </div>

        <div className="feature-list">
          <div>
            <span>V1 choices</span>
            <p>Email/password auth, org-wide visibility, general posts, admin control.</p>
          </div>
          <div>
            <span>Next backend phase</span>
            <p>Django REST endpoints can mirror the mock contracts already driving this front end.</p>
          </div>
        </div>
      </section>

      <section className="phone-stage">
        <div className="phone-frame">
          <header className="phone-header">
            <div>
              <span className="wordmark">beam</span>
              <p>{organisation.name}</p>
            </div>
            <button className="ghost-button">Invite Only</button>
          </header>

          <main className="phone-content">
            {activeTab === 'feed' && (
              <FeedScreen
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                posts={visiblePosts}
              />
            )}
            {activeTab === 'celebrate' && (
              <CelebrateScreen
                composerStep={composerStep}
                onComposerStepChange={setComposerStep}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            )}
            {activeTab === 'notifications' && <NotificationsScreen items={notifications} />}
            {activeTab === 'team' && <TeamScreen members={team} />}
            {activeTab === 'profile' && <ProfileScreen user={signedInUser} />}
          </main>

          <nav className="bottom-nav">
            {[
              { id: 'feed', label: 'Feed' },
              { id: 'celebrate', label: 'Celebrate' },
              { id: 'notifications', label: 'Alerts' },
              { id: 'team', label: 'Team' },
              { id: 'profile', label: 'Profile' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={tab.id === activeTab ? 'nav-item active' : 'nav-item'}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </section>

      <section className="workspace-panel">
        <AuthCard />
        <OrgControlCard />
        <AdminCard />
      </section>
    </div>
  )
}

function AuthCard() {
  return (
    <article className="side-card">
      <span className="eyebrow">Auth experience</span>
      <h2>Email sign in for the pilot</h2>
      <form className="auth-form">
        <label>
          Work email
          <input type="email" defaultValue="rob@mmc.co.uk" />
        </label>
        <label>
          Password
          <input type="password" defaultValue="password123" />
        </label>
        <button type="button" className="primary-button">
          Sign in to Beam
        </button>
      </form>
      <p className="muted-copy">Google OAuth is intentionally deferred until after the pilot learns what users actually need.</p>
    </article>
  )
}

function OrgControlCard() {
  return (
    <article className="side-card">
      <span className="eyebrow">Organisation onboarding</span>
      <h2>Join with an invite</h2>
      <div className="invite-panel">
        <div>
          <p className="invite-label">Workspace</p>
          <strong>{organisation.name}</strong>
        </div>
        <div>
          <p className="invite-label">Invite code</p>
          <strong>MMC-BEAM-042</strong>
        </div>
        <div>
          <p className="invite-label">Pending invites</p>
          <strong>{organisation.invitesPending}</strong>
        </div>
      </div>
      <p className="muted-copy">
        Invite-only is the right call for the pilot. It keeps culture safe, avoids random signups, and mirrors how the first rollout will really happen.
      </p>
    </article>
  )
}

function AdminCard() {
  return (
    <article className="side-card">
      <span className="eyebrow">Admin controls</span>
      <h2>Full control from day one</h2>
      <ul className="admin-list">
        <li>Invite or remove users</li>
        <li>Promote members to admin</li>
        <li>Delete posts and comments</li>
        <li>Suspend accounts if needed</li>
        <li>Correct category mistakes</li>
      </ul>
      <p className="muted-copy">The first backend slice should expose these actions behind an admin-only permission layer.</p>
    </article>
  )
}

function FeedScreen({ activeCategory, onCategoryChange, posts }) {
  return (
    <div className="screen">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">Pilot workspace</span>
          <h2>Good things are happening at MMC today.</h2>
        </div>
        <strong>42 colleagues live</strong>
      </section>

      <div className="pill-row">
        {categories.map((category) => (
          <button
            key={category.id}
            className={activeCategory === category.id ? 'pill active' : 'pill'}
            style={{
              '--pill-accent': category.accent,
            }}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="post-stack">
        {posts.map((post) => (
          <article key={post.id} className="post-card">
            <div className="post-header">
              <div className="avatar">{post.initials}</div>
              <div>
                <strong>{post.author}</strong>
                <p>
                  {post.role} • {post.time}
                </p>
              </div>
              <span
                className="category-badge"
                style={{ '--badge-accent': categoryMeta[post.category].accent }}
              >
                {categoryMeta[post.category].icon}
              </span>
            </div>
            <p className="post-copy">{post.content}</p>
            <div className="reaction-row">
              <button>Cheer {post.reactions.cheer}</button>
              <button>Heart {post.reactions.heart}</button>
              <button>Fire {post.reactions.fire}</button>
              <span>{post.comments} comments</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function CelebrateScreen({
  composerStep,
  onComposerStepChange,
  selectedCategory,
  onSelectCategory,
}) {
  return (
    <div className="screen">
      <section className="compose-panel">
        <div className="compose-header">
          <span className="eyebrow">Celebrate flow</span>
          <strong>Category - Write - Post</strong>
        </div>
        <div className="step-row">
          <button
            className={composerStep === 1 ? 'step-chip active' : 'step-chip'}
            onClick={() => onComposerStepChange(1)}
          >
            1. Choose
          </button>
          <button
            className={composerStep === 2 ? 'step-chip active' : 'step-chip'}
            onClick={() => onComposerStepChange(2)}
          >
            2. Compose
          </button>
        </div>
        {composerStep === 1 ? (
          <div className="category-grid">
            {categories
              .filter((category) => category.id !== 'all')
              .map((category) => (
                <button
                  key={category.id}
                  className={selectedCategory === category.id ? 'category-tile active' : 'category-tile'}
                  style={{ '--tile-accent': category.accent }}
                  onClick={() => onSelectCategory(category.id)}
                >
                  <strong>{category.label}</strong>
                  <span>Warm, fast, positive posting</span>
                </button>
              ))}
          </div>
        ) : (
          <div className="composer-card">
            <div className="composer-topline">
              <span>Posting to {organisation.name}</span>
              <span className="selected-tag">{selectedCategory}</span>
            </div>
            <textarea defaultValue="Shoutout to the team for pulling together before validation. Proud to work with people who always show up for each other." />
            <div className="composer-actions">
              <button className="ghost-button">Add @mention</button>
              <button className="ghost-button">Upload image</button>
            </div>
            <button className="primary-button full-width">Post your Beam</button>
          </div>
        )}
      </section>
    </div>
  )
}

function NotificationsScreen({ items }) {
  return (
    <div className="screen">
      <section className="section-header">
        <div>
          <span className="eyebrow">Notifications</span>
          <h2>2 unread</h2>
        </div>
      </section>
      <div className="notification-stack">
        {items.map((item) => (
          <article key={item.id} className={item.unread ? 'notification-card unread' : 'notification-card'}>
            <div>
              <strong>{item.label}</strong>
              <p>{item.time} ago</p>
            </div>
            {item.unread && <span className="unread-dot" />}
          </article>
        ))}
      </div>
    </div>
  )
}

function TeamScreen({ members }) {
  return (
    <div className="screen">
      <section className="section-header">
        <div>
          <span className="eyebrow">Team</span>
          <h2>Discover your colleagues</h2>
        </div>
        <input className="search-input" defaultValue="Search Lauren" />
      </section>
      <div className="team-stack">
        {members.map((member) => (
          <article key={member.id} className="team-card">
            <div className="avatar">{member.initials}</div>
            <div className="team-copy">
              <strong>{member.name}</strong>
              <p>{member.role}</p>
            </div>
            <div className="team-stats">
              <span>Received {member.received}</span>
              <span>Given {member.given}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function ProfileScreen({ user }) {
  return (
    <div className="screen">
      <section className="profile-hero">
        <div className="profile-avatar">{user.initials}</div>
        <div>
          <span className="eyebrow">Your profile</span>
          <h2>{user.name}</h2>
          <p>{user.role}</p>
        </div>
      </section>
      <section className="stats-grid">
        <article>
          <span>Beams given</span>
          <strong>{user.beamsGiven}</strong>
        </article>
        <article>
          <span>Beams received</span>
          <strong>{user.beamsReceived}</strong>
        </article>
      </section>
      <section className="badge-row">
        <span className="badge">First Beam</span>
        <span className="badge">Culture Builder</span>
        <span className="badge">On Fire</span>
      </section>
      <article className="side-card profile-note">
        <span className="eyebrow">Profile direction</span>
        <h2>Not a CV. A celebration reel.</h2>
        <p>That product philosophy is clear in the copy, the stats, and the emotional tone of the page.</p>
      </article>
    </div>
  )
}

export default App
