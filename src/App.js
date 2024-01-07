import React from 'react';
import { RouterProvider, createBrowserRouter, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import UrlGen from './components/UrlGen.jsx'

// Ensures cookie is sent
axios.defaults.withCredentials = true;

const serverUrl = process.env.SERVER_URL;

const AuthContext = createContext();

const AuthContextProvider = ({ children }) => {
  const [loggedIn, setLoggedIn] = useState(null);
  const [user, setUser] = useState(null);

  const checkLoginState = useCallback(async () => {
    try {
      const { data: { loggedIn: logged_in, user }} = await axios.get(`${serverUrl}/auth/logged_in`);
      setLoggedIn(logged_in);
      user && setUser(user);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    checkLoginState();
  }, [checkLoginState]);

  return (
    <AuthContext.Provider value={{ loggedIn, checkLoginState, user }}>
      {children}
    </AuthContext.Provider>
  );
}



const Dashboard = () => {
  const { user, loggedIn, checkLoginState } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await axios.post(`${serverUrl}/auth/logout`);
      // Check login state again
      checkLoginState();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <h3>Dashboard</h3>
      <button className="btn" onClick={handleLogout} >Logout</button>
      <h4>{user?.name}</h4>
      <br />
      <p>{user?.email}</p>
      <br />
      <img src={user?.picture} alt={user?.name} />
      <br />
      <div>
        <UrlGen />
      </div>
    </>
  )
}

const Login = () => {
  const handleLogin = async () => {
    try {
      // Gets authentication url from backend server
      const url = await axios.get(`${serverUrl}/auth/google`);
      // Navigate to conset screen
      window.location.assign(url.data);
    } catch (err) {
      console.error(err);
    }
  }
  return <>
  <h3>Login to Dashboard</h3>
  <button className="btn" onClick={handleLogin} >Login</button>
  </>
}


const Callback = () => {
  const called = useRef(false);
  const { checkLoginState, loggedIn } = useContext(AuthContext);
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      if (loggedIn === false) {
        try {
          if (called.current) return; // prevent rerender caused by StrictMode
          called.current = true;
          const res = await axios.get(`${serverUrl}/auth/token${window.location.search}`);
          checkLoginState();
          navigate('/');
        } catch (err) {
          console.error(err);
          navigate('/');
        }
      } else if (loggedIn === true) {
        navigate('/');
      }
    })();
  }, [checkLoginState, loggedIn, navigate])
  return <></>
};

const Home = () => {
  const { loggedIn } = useContext(AuthContext);
  if (loggedIn === true) return <Dashboard />;
  if (loggedIn === false) return <Login />
  return <></>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/auth/callback', // google will redirect here
    element: <Callback />,
  }
]);

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <AuthContextProvider>
          <RouterProvider router={router} />
        </AuthContextProvider>
      </header>
    </div>
  );
}

export default App;