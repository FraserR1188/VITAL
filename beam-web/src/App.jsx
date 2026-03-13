import { useEffect, useMemo, useState } from 'react'
import { categories, notifications as mockNotifications, organisation as mockOrganisation } from './data/mockData'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const inviteCode = 'MMC-BEAM-042'

const categoryMeta = {
  achievement: { icon: 'Award', accent: '#ffd166' },
  kindness: { icon: 'Heart', accent: '#ff6b9d' },
  personal: { icon: 'Spark', accent: '#a78bfa' },
  fitness: { icon: 'Pulse', accent: '#06d6a0' },
}

const initialCredentials = {
  email: 'rob@mmc.co.uk',
  password: 'password1234',
}

function App() {
  const [activeTab, setActiveTab] = useState('feed')
  const [activeCategory, setActiveCategory] = useState('all')
  const [composerStep, setComposerStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('achievement')
  const [composerText, setComposerText] = useState(
    'Shoutout to the team for pulling together before validation. Proud to work with people who always show up for each other.',
  )
  const [token, setToken] = useState(() => localStorage.getItem('beam-token') || '')
  const [credentials, setCredentials] = useState(initialCredentials)
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invitePreview, setInvitePreview] = useState(null)
  const [user, setUser] = useState(null)
  const [feed, setFeed] = useState([])
  const [team, setTeam] = useState([])
  const [notifications, setNotifications] = useState(mockNotifications)

  useEffect(() => {
    let cancelled = false

    async function loadInvitePreview() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/invites/${inviteCode}/`)
        if (!response.ok) {
          return
        }
        const data = await response.json()
        if (!cancelled) {
          setInvitePreview(data)
        }
      } catch {
        // Keep the static invite copy if the API is offline.
      }
    }

    loadInvitePreview()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setFeed([])
      setTeam([])
      return
    }

    let cancelled = false

    async function loadAppData() {
      setLoading(true)
      try {
        const [meResponse, feedResponse, teamResponse, notificationsResponse] = await Promise.all([
          fetchWithAuth('/api/auth/me/', token),
          fetchWithAuth(`/api/feed/${activeCategory === 'all' ? '' : `?category=${activeCategory}`}`, token),
          fetchWithAuth('/api/team/', token),
          fetchWithAuth('/api/notifications/', token),
        ])

        if (cancelled) {
          return
        }

        setUser(meResponse)
        setFeed(feedResponse)
        setTeam(teamResponse.map(mapTeamMember))
        setNotifications(
          notificationsResponse.length > 0
            ? notificationsResponse.map((item) => ({
                id: item.id,
                label: formatNotification(item),
                time: formatRelativeTime(item.created_at),
                unread: !item.read,
              }))
            : [],
        )
        setAuthError('')
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unable to reach the Beam API.'
          setAuthError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAppData()

    return () => {
      cancelled = true
    }
  }, [token, activeCategory])

  const visiblePosts = useMemo(() => feed.map(mapPost), [feed])

  const organisation = invitePreview?.organisation
    ? {
        name: invitePreview.organisation.name,
        invitesPending: invitePreview.organisation.pending_invites,
      }
    : mockOrganisation

  async function handleSignIn(event) {
    event.preventDefault()
    setLoading(true)
    setAuthError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        throw new Error('Sign-in failed. Check the seeded demo credentials and that the Django server is running.')
      }

      const data = await response.json()
      localStorage.setItem('beam-token', data.access)
      setToken(data.access)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed.'
      setAuthError(message)
      setLoading(false)
    }
  }

  async function handleCreatePost() {
    if (!token || !composerText.trim()) {
      return
    }

    setLoading(true)
    try {
      await fetch(`${apiBaseUrl}/api/posts/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          content: composerText.trim(),
        }),
      }).then(handleJsonResponse)

      setComposerStep(1)
      setComposerText('')
      setActiveTab('feed')
      const refreshedFeed = await fetchWithAuth('/api/feed/', token)
      setFeed(refreshedFeed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Post creation failed.'
      setAuthError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('beam-token')
    setToken('')
    setUser(null)
    setFeed([])
    setTeam([])
  }

  const isAuthenticated = Boolean(token && user)
  const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'Pilot user'

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
            <span className="eyebrow">Now live</span>
            <strong>Front end + Django API</strong>
            <p>The app now signs into the seeded backend and reads real feed, team, and notification data.</p>
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
            <span>Live demo credentials</span>
            <p>`rob@mmc.co.uk` with `password1234` matches the seeded backend account.</p>
          </div>
          <div>
            <span>Next backend phase</span>
            <p>Comments, reactions, moderation actions, and invite creation are the next highest-value endpoints.</p>
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
            {isAuthenticated ? (
              <button className="ghost-button" onClick={handleLogout}>
                Sign out
              </button>
            ) : (
              <button className="ghost-button">Invite Only</button>
            )}
          </header>

          <main className="phone-content">
            {activeTab === 'feed' && (
              <FeedScreen
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                posts={visiblePosts}
                isAuthenticated={isAuthenticated}
                isLoading={loading}
              />
            )}
            {activeTab === 'celebrate' && (
              <CelebrateScreen
                composerStep={composerStep}
                onComposerStepChange={setComposerStep}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                composerText={composerText}
                onComposerTextChange={setComposerText}
                onSubmit={handleCreatePost}
                isAuthenticated={isAuthenticated}
                organisationName={organisation.name}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationsScreen items={notifications} isAuthenticated={isAuthenticated} />
            )}
            {activeTab === 'team' && <TeamScreen members={team} isAuthenticated={isAuthenticated} />}
            {activeTab === 'profile' && <ProfileScreen user={user} isAuthenticated={isAuthenticated} />}
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
        <AuthCard
          credentials={credentials}
          onCredentialsChange={setCredentials}
          onSubmit={handleSignIn}
          authError={authError}
          isLoading={loading}
          isAuthenticated={isAuthenticated}
          userName={userName}
        />
        <OrgControlCard organisation={organisation} />
        <AdminCard />
      </section>
    </div>
  )
}

function AuthCard({
  credentials,
  onCredentialsChange,
  onSubmit,
  authError,
  isLoading,
  isAuthenticated,
  userName,
}) {
  return (
    <article className="side-card">
      <span className="eyebrow">Auth experience</span>
      <h2>{isAuthenticated ? `Signed in as ${userName}` : 'Email sign in for the pilot'}</h2>
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Work email
          <input
            type="email"
            value={credentials.email}
            onChange={(event) =>
              onCredentialsChange((current) => ({ ...current, email: event.target.value }))
            }
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={credentials.password}
            onChange={(event) =>
              onCredentialsChange((current) => ({ ...current, password: event.target.value }))
            }
          />
        </label>
        <button type="submit" className="primary-button" disabled={isLoading}>
          {isAuthenticated ? 'Refresh session' : 'Sign in to Beam'}
        </button>
      </form>
      {authError ? <p className="error-copy">{authError}</p> : null}
      <p className="muted-copy">
        Google OAuth is intentionally deferred until after the pilot learns what users actually need.
      </p>
    </article>
  )
}

function OrgControlCard({ organisation }) {
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
          <strong>{inviteCode}</strong>
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

function FeedScreen({ activeCategory, onCategoryChange, posts, isAuthenticated, isLoading }) {
  return (
    <div className="screen">
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">Pilot workspace</span>
          <h2>Good things are happening at MMC today.</h2>
        </div>
        <strong>{isAuthenticated ? `${posts.length} live posts` : 'Sign in to view'}</strong>
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

      {!isAuthenticated ? (
        <EmptyState title="Sign in to view the live feed" body="The mobile shell is ready. Once you sign in, this tab reads directly from the Django API." />
      ) : isLoading ? (
        <EmptyState title="Loading the feed" body="Pulling the latest Beams from MMC." />
      ) : (
        <div className="post-stack">
          {posts.map((post) => (
            <article key={post.id} className="post-card">
              <div className="post-header">
                <div className="avatar">{post.initials}</div>
                <div>
                  <strong>{post.author}</strong>
                  <p>
                    {post.role} - {post.time}
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
      )}
    </div>
  )
}

function CelebrateScreen({
  composerStep,
  onComposerStepChange,
  selectedCategory,
  onSelectCategory,
  composerText,
  onComposerTextChange,
  onSubmit,
  isAuthenticated,
  organisationName,
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
        {!isAuthenticated ? (
          <EmptyState title="Sign in to post" body="The create-post flow is connected and ready once the pilot user is authenticated." />
        ) : composerStep === 1 ? (
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
              <span>Posting to {organisationName}</span>
              <span className="selected-tag">{selectedCategory}</span>
            </div>
            <textarea value={composerText} onChange={(event) => onComposerTextChange(event.target.value)} />
            <div className="composer-actions">
              <button className="ghost-button">Add @mention</button>
              <button className="ghost-button">Upload image</button>
            </div>
            <button className="primary-button full-width" onClick={onSubmit} disabled={!composerText.trim()}>
              Post your Beam
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function NotificationsScreen({ items, isAuthenticated }) {
  if (!isAuthenticated) {
    return <EmptyState title="Sign in to view alerts" body="Notifications are now backed by the API and will show live once you are authenticated." />
  }

  return (
    <div className="screen">
      <section className="section-header">
        <div>
          <span className="eyebrow">Notifications</span>
          <h2>{items.filter((item) => item.unread).length} unread</h2>
        </div>
      </section>
      <div className="notification-stack">
        {items.map((item) => (
          <article key={item.id} className={item.unread ? 'notification-card unread' : 'notification-card'}>
            <div>
              <strong>{item.label}</strong>
              <p>{item.time}</p>
            </div>
            {item.unread && <span className="unread-dot" />}
          </article>
        ))}
      </div>
    </div>
  )
}

function TeamScreen({ members, isAuthenticated }) {
  if (!isAuthenticated) {
    return <EmptyState title="Sign in to browse the team" body="This tab reads directly from the organisation user list once you are signed in." />
  }

  return (
    <div className="screen">
      <section className="section-header">
        <div>
          <span className="eyebrow">Team</span>
          <h2>Discover your colleagues</h2>
        </div>
        <input className="search-input" defaultValue="MMC pilot" readOnly />
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

function ProfileScreen({ user, isAuthenticated }) {
  if (!isAuthenticated || !user) {
    return <EmptyState title="Sign in to load your profile" body="Profile stats now come from the authenticated user endpoint." />
  }

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="screen">
      <section className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div>
          <span className="eyebrow">Your profile</span>
          <h2>{`${user.first_name} ${user.last_name}`.trim()}</h2>
          <p>{user.job_title || user.role}</p>
        </div>
      </section>
      <section className="stats-grid">
        <article>
          <span>Beams given</span>
          <strong>{user.beams_given}</strong>
        </article>
        <article>
          <span>Beams received</span>
          <strong>{user.beams_received}</strong>
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

function EmptyState({ title, body }) {
  return (
    <article className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  )
}

async function fetchWithAuth(path, token) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return handleJsonResponse(response)
}

async function handleJsonResponse(response) {
  if (!response.ok) {
    let message = 'Beam API request failed.'
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') {
        message = body.detail
      }
    } catch {
      // Keep the fallback message when the body is not JSON.
    }

    throw new Error(message)
  }

  return response.json()
}

function mapPost(post) {
  return {
    id: post.id,
    author: post.author.full_name,
    role: post.author.job_title || 'MMC colleague',
    initials: post.author.initials,
    category: post.category,
    time: formatRelativeTime(post.created_at),
    content: post.content,
    reactions: post.reactions,
    comments: post.comments_count,
  }
}

function mapTeamMember(member) {
  const parts = member.full_name.split(' ')
  return {
    id: member.id,
    name: member.full_name,
    role: member.job_title || 'MMC colleague',
    initials: `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase(),
    given: member.beams_given,
    received: member.beams_received,
  }
}

function formatNotification(item) {
  if (item.type === 'reaction') {
    return `${item.actor_name} reacted to your Beam`
  }
  if (item.type === 'comment') {
    return `${item.actor_name} commented on your Beam`
  }
  if (item.type === 'mention') {
    return `${item.actor_name} mentioned you in a Beam`
  }
  return `${item.actor_name} sent you a Beam`
}

function formatRelativeTime(value) {
  const inputDate = new Date(value)
  const now = new Date()
  const diffMinutes = Math.round((now - inputDate) / 60000)

  if (Number.isNaN(diffMinutes)) {
    return 'Just now'
  }

  if (diffMinutes < 1) {
    return 'Just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hr ago`
  }

  return inputDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export default App
