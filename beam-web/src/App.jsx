import { useEffect, useMemo, useState } from 'react'
import { notifications as mockNotifications, organisation as mockOrganisation } from './data/mockData'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const defaultInviteCode = 'MMC-BEAM-042'
const tabs = ['feed', 'celebrate', 'team', 'notifications', 'profile']
const categories = ['all', 'achievement', 'kindness', 'personal', 'fitness']
const meta = {
  achievement: { label: 'Achievement', accent: '#b5a642' },
  kindness: { label: 'Kindness', accent: '#b5624a' },
  personal: { label: 'Personal', accent: '#7a6b8a' },
  fitness: { label: 'Fitness', accent: '#4a7a6b' },
}

function App() {
  const [activeView, setActiveView] = useState('feed')
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('achievement')
  const [composerText, setComposerText] = useState('Shoutout to the team for pulling together before validation.')
  const [token, setToken] = useState(() => localStorage.getItem('beam-token') || '')
  const [authMode, setAuthMode] = useState('signin')
  const [credentials, setCredentials] = useState({ email: 'rob@mmc.co.uk', password: 'password1234' })
  const [registration, setRegistration] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    job_title: '',
    department: '',
    invite_code: defaultInviteCode,
  })
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [invitePreview, setInvitePreview] = useState(null)
  const [user, setUser] = useState(null)
  const [feed, setFeed] = useState([])
  const [team, setTeam] = useState([])
  const [notifications, setNotifications] = useState(mockNotifications)
  const [commentsByPost, setCommentsByPost] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [createdInvites, setCreatedInvites] = useState([])
  const [adminUsers, setAdminUsers] = useState([])

  const inviteCode = authMode === 'register' ? registration.invite_code || defaultInviteCode : defaultInviteCode
  const isAuthed = Boolean(token && user)
  const isAdmin = user?.role === 'admin'
  const org = invitePreview?.organisation
    ? { name: invitePreview.organisation.name, invitesPending: invitePreview.organisation.pending_invites }
    : mockOrganisation
  const posts = useMemo(() => feed.map(mapPost), [feed])

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/invites/${inviteCode}/`)
      .then(async (response) => {
        setInvitePreview(response.ok ? await response.json() : null)
      })
      .catch(() => setInvitePreview(null))
  }, [inviteCode])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setFeed([])
      setTeam([])
      setCreatedInvites([])
      setAdminUsers([])
      return
    }
    setLoading(true)
    Promise.all([
      fetchWithAuth('/api/auth/me/', token),
      fetchWithAuth(`/api/feed/${activeCategory === 'all' ? '' : `?category=${activeCategory}`}`, token),
      fetchWithAuth('/api/team/', token),
      fetchWithAuth('/api/notifications/', token),
    ])
      .then(([me, feedData, teamData, notificationData]) => {
        setUser(me)
        setFeed(feedData)
        setTeam(teamData.map(mapTeam))
        setNotifications(notificationData.length ? notificationData.map(mapNotification) : [])
      })
      .catch((error) => setAuthError(error instanceof Error ? error.message : 'Unable to reach the API.'))
      .finally(() => setLoading(false))
  }, [token, activeCategory])

  useEffect(() => {
    if (!token || !isAdmin) return
    Promise.all([fetchWithAuth('/api/invites/', token), fetchWithAuth('/api/users/', token)])
      .then(([invites, users]) => {
        setCreatedInvites(invites)
        setAdminUsers(users)
      })
      .catch(() => {
        setCreatedInvites([])
        setAdminUsers([])
      })
  }, [token, isAdmin])

  async function signIn(event) {
    event.preventDefault()
    setLoading(true)
    setAuthError('')
    const response = await fetch(`${apiBaseUrl}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    if (!response.ok) {
      setAuthError('Sign-in failed. Check credentials and that Django is running.')
      setLoading(false)
      return
    }
    const data = await response.json()
    localStorage.setItem('beam-token', data.access)
    setToken(data.access)
    setActiveView('feed')
  }

  async function register(event) {
    event.preventDefault()
    setLoading(true)
    setAuthError('')
    setAuthSuccess('')
    try {
      await fetch(`${apiBaseUrl}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registration),
      }).then(handleJson)
      setAuthMode('signin')
      setCredentials({ email: registration.email, password: registration.password })
      setRegistration((current) => ({
        ...current,
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        job_title: '',
        department: '',
      }))
      setAuthSuccess('Registration complete. You can now sign in.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  async function createPost() {
    if (!token || !composerText.trim()) return
    const created = await fetch(`${apiBaseUrl}/api/posts/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: selectedCategory, content: composerText.trim() }),
    }).then(handleJson)
    setFeed((current) => [created, ...current])
    setComposerText('')
    setActiveView('feed')
  }

  async function toggleReaction(postId, reactionType) {
    if (!token) return
    const updated = await fetch(`${apiBaseUrl}/api/posts/${postId}/reactions/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: reactionType }),
    }).then(handleJson)
    setFeed((current) => current.map((post) => (post.id === postId ? updated : post)))
  }

  async function toggleComments(postId) {
    if (!token) return
    if (commentsByPost[postId]) {
      setCommentsByPost((current) => {
        const next = { ...current }
        delete next[postId]
        return next
      })
      return
    }
    const comments = await fetchWithAuth(`/api/posts/${postId}/comments/`, token)
    setCommentsByPost((current) => ({ ...current, [postId]: comments }))
  }

  async function createComment(postId) {
    if (!token || !commentDrafts[postId]?.trim()) return
    const comment = await fetch(`${apiBaseUrl}/api/posts/${postId}/comments/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentDrafts[postId].trim() }),
    }).then(handleJson)
    setCommentsByPost((current) => ({ ...current, [postId]: [...(current[postId] || []), comment] }))
    setCommentDrafts((current) => ({ ...current, [postId]: '' }))
    setFeed((current) =>
      current.map((post) => (post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post))
    )
  }

  async function createInvite(event) {
    event.preventDefault()
    if (!token || !inviteEmail.trim()) return
    const invite = await fetch(`${apiBaseUrl}/api/invites/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    }).then(handleJson)
    setCreatedInvites((current) => [invite, ...current])
    setInviteEmail('')
  }

  async function updateUser(userId, updates) {
    if (!token) return
    const updated = await fetch(`${apiBaseUrl}/api/users/${userId}/`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(handleJson)
    setAdminUsers((current) => current.map((member) => (member.id === userId ? { ...member, ...updated } : member)))
  }

  async function deletePost(postId) {
    if (!token) return
    const response = await fetch(`${apiBaseUrl}/api/posts/${postId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('Post deletion failed.')
    setFeed((current) => current.filter((post) => post.id !== postId))
  }

  if (!isAuthed) {
    return (
      <div className="landing-shell">
        <section className="landing-hero">
          <span className="hero-kicker">Beam</span>
          <h1>
            Celebrate the people behind the <em>work.</em>
          </h1>
          <p>Sign in to the pilot or join with an invite code to enter the product.</p>
          <div className="hero-stats">
            <div>
              <span>Pilot focus</span>
              <strong>MMC first</strong>
            </div>
            <div>
              <span>Access</span>
              <strong>Invite only</strong>
            </div>
            <div>
              <span>Tone</span>
              <strong>Warm and human</strong>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === 'signin' ? 'tab-button active' : 'tab-button'}
              onClick={() => setAuthMode('signin')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'tab-button active' : 'tab-button'}
              onClick={() => setAuthMode('register')}
            >
              Join with invite
            </button>
          </div>
          <div className="auth-card">
            <span className="eyebrow">Pilot access</span>
            <h2>{authMode === 'signin' ? 'Welcome back to Beam' : 'Create your Beam account'}</h2>
            {authMode === 'signin' ? (
              <form className="auth-form" onSubmit={signIn}>
                <label>
                  Work email
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in to Beam'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={register}>
                <label>
                  Invite code
                  <input
                    type="text"
                    value={registration.invite_code}
                    onChange={(event) =>
                      setRegistration((current) => ({ ...current, invite_code: event.target.value.toUpperCase() }))
                    }
                  />
                </label>
                <label>
                  Work email
                  <input
                    type="email"
                    value={registration.email}
                    onChange={(event) => setRegistration((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <div className="split-grid">
                  <label>
                    First name
                    <input
                      type="text"
                      value={registration.first_name}
                      onChange={(event) =>
                        setRegistration((current) => ({ ...current, first_name: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      type="text"
                      value={registration.last_name}
                      onChange={(event) => setRegistration((current) => ({ ...current, last_name: event.target.value }))}
                    />
                  </label>
                </div>
                <label>
                  Job title
                  <input
                    type="text"
                    value={registration.job_title}
                    onChange={(event) => setRegistration((current) => ({ ...current, job_title: event.target.value }))}
                  />
                </label>
                <label>
                  Department
                  <input
                    type="text"
                    value={registration.department}
                    onChange={(event) =>
                      setRegistration((current) => ({ ...current, department: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={registration.password}
                    onChange={(event) => setRegistration((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Creating account...' : 'Join the workspace'}
                </button>
              </form>
            )}
            {invitePreview?.organisation && authMode === 'register' ? (
              <p className="success-copy">Invite valid for {invitePreview.organisation.name}.</p>
            ) : null}
            {authError ? <p className="error-copy">{authError}</p> : null}
            {authSuccess ? <p className="success-copy">{authSuccess}</p> : null}
            <p className="muted-copy">Demo credentials: rob@mmc.co.uk / password1234</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="product-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="wordmark">Beam</span>
          <span className="brand-meta">{org.name}</span>
        </div>
        <nav className="desktop-nav">
          {(isAdmin ? [...tabs, 'admin'] : tabs).map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeView === tab ? 'nav-link active' : 'nav-link'}
              onClick={() => setActiveView(tab)}
            >
              {tab === 'notifications' ? 'Alerts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <div className="user-chip">{`${user.first_name} ${user.last_name}`.trim()}</div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              localStorage.removeItem('beam-token')
              setToken('')
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="app-layout">
        <aside className="left-rail">
          <article className="summary-card identity-card">
            <div className="profile-avatar">{`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}</div>
            <div>
              <span className="eyebrow">Logged in</span>
              <h2>{`${user.first_name} ${user.last_name}`.trim()}</h2>
              <p>{user.job_title || user.role}</p>
            </div>
          </article>
          <article className="summary-card">
            <span className="eyebrow">Workspace</span>
            <h3>{org.name}</h3>
            <div className="metric-row">
              <div>
                <span>Unread</span>
                <strong>{notifications.filter((item) => item.unread).length}</strong>
              </div>
              <div>
                <span>Invites</span>
                <strong>{org.invitesPending}</strong>
              </div>
            </div>
          </article>
          <article className="summary-card">
            <span className="eyebrow">Your stats</span>
            <div className="metric-row">
              <div>
                <span>Given</span>
                <strong>{user.beams_given}</strong>
              </div>
              <div>
                <span>Received</span>
                <strong>{user.beams_received}</strong>
              </div>
            </div>
          </article>
        </aside>

        <div className="content-panel">
          {activeView === 'feed' ? (
            <FeedSection
              posts={posts}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              isLoading={loading}
              isAdmin={isAdmin}
              commentsByPost={commentsByPost}
              commentDrafts={commentDrafts}
              setCommentDrafts={setCommentDrafts}
              toggleReaction={toggleReaction}
              toggleComments={toggleComments}
              createComment={createComment}
            />
          ) : null}
          {activeView === 'celebrate' ? (
            <CelebrateSection
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              composerText={composerText}
              setComposerText={setComposerText}
              createPost={createPost}
              loading={loading}
            />
          ) : null}
          {activeView === 'team' ? <TeamSection team={team} /> : null}
          {activeView === 'notifications' ? <NotificationSection notifications={notifications} /> : null}
          {activeView === 'profile' ? <ProfileSection user={user} /> : null}
          {activeView === 'admin' && isAdmin ? (
            <AdminSection
              org={org}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              createInvite={createInvite}
              createdInvites={createdInvites}
              adminUsers={adminUsers}
              visiblePosts={posts}
              updateUser={updateUser}
              deletePost={deletePost}
              loading={loading}
            />
          ) : null}
        </div>
      </main>

      <nav className="mobile-nav">
        {(isAdmin ? [...tabs, 'admin'] : tabs).map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeView === tab ? 'mobile-nav-link active' : 'mobile-nav-link'}
            onClick={() => setActiveView(tab)}
          >
            {tab === 'notifications' ? 'Alerts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
    </div>
  )
}

function FeedSection({ posts, activeCategory, setActiveCategory, isLoading, isAdmin, commentsByPost, commentDrafts, setCommentDrafts, toggleReaction, toggleComments, createComment }) {
  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Feed</span>
          <h1>What people are celebrating</h1>
        </div>
        <span className="page-meta">{posts.length} live posts</span>
      </div>
      <div className="pill-row">
        {categories.map((category) => (
          <button key={category} type="button" className={activeCategory === category ? 'pill active' : 'pill'} onClick={() => setActiveCategory(category)}>
            {category === 'all' ? 'All' : meta[category].label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <EmptyState title="Loading the feed" body="Pulling the latest Beams from MMC." />
      ) : (
        <div className="content-stack">
          {posts.map((post) => (
            <article key={post.id} className="post-card elevated">
              <div className="post-header">
                <div className="avatar">{post.initials}</div>
                <div>
                  <strong>{post.author}</strong>
                  <p>{post.role} - {post.time}</p>
                </div>
                <span className="category-badge" style={{ '--badge-accent': meta[post.category].accent }}>{meta[post.category].label}</span>
              </div>
              <p className="post-copy">{post.content}</p>
              <div className="reaction-row">
                {['cheer', 'heart', 'fire'].map((reactionType) => (
                  <button key={reactionType} type="button" className={post.currentUserReactions.includes(reactionType) ? 'reaction-chip active' : 'reaction-chip'} onClick={() => toggleReaction(post.id, reactionType)}>
                    {reactionType.charAt(0).toUpperCase() + reactionType.slice(1)} {post.reactions[reactionType]}
                  </button>
                ))}
                <button type="button" className="comment-toggle" onClick={() => toggleComments(post.id)}>
                  {commentsByPost[post.id] ? 'Hide comments' : `${post.comments} comments`}
                </button>
              </div>
              {commentsByPost[post.id] ? (
                <div className="comments-panel">
                  <div className="comment-stack">
                    {commentsByPost[post.id].map((comment) => (
                      <article key={comment.id} className="comment-card">
                        <div className="avatar comment-avatar">{comment.author.initials}</div>
                        <div className="comment-copy">
                          <strong>{comment.author.full_name}</strong>
                          <p>{comment.content}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="comment-compose">
                    <input type="text" value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Add a comment..." />
                    <button type="button" className="primary-button" onClick={() => createComment(post.id)}>Post</button>
                  </div>
                </div>
              ) : null}
              {isAdmin ? (
                <div className="post-admin-row">
                  <span className="admin-note">Admin moderation enabled</span>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function CelebrateSection({ selectedCategory, setSelectedCategory, composerText, setComposerText, createPost, loading }) {
  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Celebrate</span>
          <h1>Share a Beam</h1>
        </div>
      </div>
      <div className="category-grid wide">
        {categories.filter((category) => category !== 'all').map((category) => (
          <button key={category} type="button" className={selectedCategory === category ? 'category-tile active' : 'category-tile'} style={{ '--tile-accent': meta[category].accent }} onClick={() => setSelectedCategory(category)}>
            <strong>{meta[category].label}</strong>
            <span>Warm, fast, positive posting</span>
          </button>
        ))}
      </div>
      <article className="compose-surface">
        <div className="composer-topline">
          <span>Ready to post</span>
          <span className="selected-tag">{selectedCategory}</span>
        </div>
        <textarea value={composerText} onChange={(event) => setComposerText(event.target.value)} placeholder="Write your Beam..." />
        <div className="composer-actions">
          <button type="button" className="ghost-button">Add @mention</button>
          <button type="button" className="ghost-button">Upload image</button>
        </div>
        <button type="button" className="primary-button full-width" onClick={createPost} disabled={loading || !composerText.trim()}>
          {loading ? 'Posting...' : 'Post your Beam'}
        </button>
      </article>
    </section>
  )
}

function TeamSection({ team }) {
  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Team</span>
          <h1>Discover your colleagues</h1>
        </div>
        <span className="page-meta">{team.length} members</span>
      </div>
      <div className="content-grid">
        {team.map((member) => (
          <article key={member.id} className="team-card elevated">
            <div className="avatar">{member.initials}</div>
            <div className="team-copy">
              <strong>{member.full_name}</strong>
              <p>{member.job_title || member.role}</p>
            </div>
            <div className="team-stats">
              <span>Received {member.beams_received || member.received}</span>
              <span>Given {member.beams_given || member.given}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function NotificationSection({ notifications }) {
  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Alerts</span>
          <h1>Notifications</h1>
        </div>
        <span className="page-meta">{notifications.filter((n) => n.unread).length} unread</span>
      </div>
      <div className="content-stack">
        {notifications.map((item) => (
          <article key={item.id} className={item.unread ? 'notification-card unread elevated' : 'notification-card elevated'}>
            <div>
              <strong>{item.label}</strong>
              <p>{item.time}</p>
            </div>
            {item.unread ? <span className="unread-dot" /> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function ProfileSection({ user }) {
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  return (
    <section className="page-shell">
      <div className="profile-hero profile-page-hero">
        <div className="profile-avatar">{initials}</div>
        <div>
          <span className="eyebrow">Profile</span>
          <h1>{`${user.first_name} ${user.last_name}`.trim()}</h1>
          <p>{user.job_title || user.role}</p>
        </div>
      </div>
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
    </section>
  )
}

function AdminSection({ org, inviteEmail, setInviteEmail, createInvite, createdInvites, adminUsers, visiblePosts, updateUser, deletePost, loading }) {
  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Command centre</h1>
        </div>
        <span className="page-meta">{org.name}</span>
      </div>
      <div className="admin-summary-grid">
        <div>
          <span>Members</span>
          <strong>{adminUsers.length}</strong>
        </div>
        <div>
          <span>Pending invites</span>
          <strong>{org.invitesPending}</strong>
        </div>
      </div>
      <div className="admin-layout">
        <article className="admin-panel-block">
          <strong>Create invite</strong>
          <form className="auth-form" onSubmit={createInvite}>
            <label>
              Invite teammate by email
              <input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="newstarter@mmc.co.uk" />
            </label>
            <button type="submit" className="primary-button" disabled={loading || !inviteEmail.trim()}>Create invite</button>
          </form>
          <div className="invite-list">
            {createdInvites.slice(0, 4).map((invite) => (
              <div key={invite.id} className="invite-list-item">
                <strong>{invite.email || 'Open invite'}</strong>
                <span>{invite.code}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="admin-panel-block">
          <strong>People</strong>
          <div className="admin-user-list">
            {adminUsers.map((member) => (
              <div key={member.id} className="admin-user-row">
                <div>
                  <strong>{member.full_name}</strong>
                  <p>{member.job_title || member.email}</p>
                </div>
                <div className="admin-actions">
                  <button type="button" className="ghost-button" onClick={() => updateUser(member.id, { role: member.role === 'admin' ? 'member' : 'admin' })}>
                    {member.role === 'admin' ? 'Make member' : 'Make admin'}
                  </button>
                  <button type="button" className={member.is_active ? 'danger-button' : 'ghost-button'} onClick={() => updateUser(member.id, { is_active: !member.is_active })}>
                    {member.is_active ? 'Suspend' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
      <article className="admin-panel-block">
        <strong>Moderation queue</strong>
        <div className="admin-post-list">
          {visiblePosts.slice(0, 5).map((post) => (
            <div key={post.id} className="admin-post-row">
              <div>
                <strong>{post.author}</strong>
                <p>{post.content}</p>
              </div>
              <button type="button" className="danger-button" onClick={() => deletePost(post.id)}>Delete</button>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  )
}

async function fetchWithAuth(path, token) {
  const response = await fetch(`${apiBaseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return handleJson(response)
}

async function handleJson(response) {
  if (!response.ok) throw new Error('Beam API request failed.')
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
    currentUserReactions: post.current_user_reactions || [],
  }
}

function mapTeam(member) {
  const parts = member.full_name.split(' ')
  return { ...member, initials: `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() }
}

function mapNotification(item) {
  return {
    id: item.id,
    label: item.type === 'reaction' ? `${item.actor_name} reacted to your Beam` : `${item.actor_name} sent activity`,
    time: formatRelativeTime(item.created_at),
    unread: !item.read,
  }
}

function formatRelativeTime(value) {
  const inputDate = new Date(value)
  const now = new Date()
  const diffMinutes = Math.round((now - inputDate) / 60000)
  if (Number.isNaN(diffMinutes) || diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  return `${Math.round(diffMinutes / 60)} hr ago`
}

export default App
