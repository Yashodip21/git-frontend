import React ,{createContext, useState,useEffect,useContext} from 'react';

const AuthContext = createContext();

export const useAuth = ()=>{
    return useContext(AuthContext);
}

export const AuthProvider =({children})=>{
    const [currentUser,setCurrentUser] = useState(null);
    const [userProfileImage, setUserProfileImage] = useState("");

    const fetchUserProfile = async (userId) => {
      if (!userId) return;
      try {
        const response = await fetch(`http://16.171.154.247:3002/userProfile/${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.profileImage) {
            setUserProfileImage(data.profileImage);
          }
        }
      } catch (err) {
        console.error("Error loading profile image in context: ", err);
      }
    };

    useEffect(()=>{
       const userId = localStorage.getItem('userId');
       if(userId){
        setCurrentUser(userId);
        fetchUserProfile(userId);
       }
    },[]);

    const value ={
        currentUser,
        setCurrentUser,
        userProfileImage,
        setUserProfileImage,
        fetchUserProfile,
    }

    return <AuthContext.Provider value ={value}>{children}</AuthContext.Provider>
}