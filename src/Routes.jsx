import React,{useEffect} from 'react';
import {useNavigate,useRoutes} from 'react-router-dom';

//Pages List
import Dashboard from "./components/dashboard/Dashboard";
import Profile from "./components/user/Profile";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import CreateRepository from "./components/repo/CreateRepository";
import RepoDetails from "./components/repo/RepoDetails";
import UserPublicProfile from "./components/user/UserPublicProfile";

//Auth Context
import {useAuth} from "./authContext";

const ProjectRoutes =()=>{
   const {currentUser,setCurrentUser} = useAuth();
   const navigate = useNavigate();

   useEffect(()=>{
    const userIdFromStorage = localStorage.getItem("userId");

    if(userIdFromStorage && !currentUser){
        setCurrentUser(userIdFromStorage);
    }
    if(!userIdFromStorage && !["/auth","/signup"].includes(window.location.pathname)){
        navigate("/auth");
    }

    // if(userIdFromStorage &&window.location.pathname=="/auth"){
    //     navigate("/")
    // }
},[currentUser,navigate,setCurrentUser]);

let element =useRoutes([
    {
        path:"/",
        element:<Dashboard/>
    },
    {
        path:"/auth",
        element:<Login/>
    },
    {
        path:"/signup",
        element:<Signup/>
    },
    {
        path:"/profile",
        element:<Profile/>
    },
    {
        path:"/user/:userId",
        element:<UserPublicProfile/>
    },
    {
        path:"/user/profile/:userId",
        element:<UserPublicProfile/>
    },
    {
        path:"/repo/create",
        element:<CreateRepository/>
    },
    {
        path:"/create",
        element:<CreateRepository/>
    },
    {
        path:"/repo/:id",
        element:<RepoDetails/>
    }
]);

  return element;


}

export default ProjectRoutes;