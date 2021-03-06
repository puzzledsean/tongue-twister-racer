import Home from './Home'
import Join from './Join'
import Create from './Create'
import Lobby from './Lobby'
import Game from './Game'

const routes =  [
  {
    path: '/',
    exact: true,
    component: Home,
  },
  {
    path: '/join',
    exact: true,
    component: Join,
  },
  {
    path: '/create',
    exact: true,
    component: Create,
  },
  {
    path: '/lobby/:id',
    component: Lobby,
  },
  {
    path: '/game/:id',
    component: Game,
  },
]

export default routes