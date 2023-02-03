import React, { useRef, useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import IdleTimer from 'react-idle-timer'
import Dialog from '@material-ui/core/Dialog'
import DialogContent from '@material-ui/core/DialogContent'
import DialogActions from '@material-ui/core/DialogActions'
import Button from '@material-ui/core/Button'
import { DialogContentText } from '@material-ui/core'
import axios from 'axios'

import { ACCES_TOKEN, REFRESH_TOKEN, CONTEXT, BACK_API_URL } from '../../constants'

import { useAppSelector, useAppDispatch } from 'state'
import { logout as logoutAction } from 'state/me'
import useStyles from './styles'

const AutoLogoutContainer = () => {
  const classes = useStyles()

  const [dialogIsOpen, setDialogIsOpen] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState()
  const dispatch = useAppDispatch()
  const history = useHistory()
  const inactifTimerRef = useRef(null)
  const sessionInactifTimerRef = useRef(null)

  const { me } = useAppSelector((state) => ({ me: state.me }))

  const logout = () => {
    setDialogIsOpen(false)
    history.push('/')
    // console.log('User a été déconnecté')
    localStorage.clear()
    dispatch(logoutAction())
    clearTimeout(sessionInactifTimerRef.current)
    clearTimeout(inactifTimerRef)
  }

  const onIdle = () => {
    setDialogIsOpen(true)
    // console.log('User inactif depuis 10 secondes')
    sessionInactifTimerRef.current = setTimeout(logout, 2 * 30 * 1000)
  }

  const stayActive = async () => {
    try {
      const res = await axios.post(`${BACK_API_URL}/accounts/refresh/`)

      if (res.status === 200) {
        localStorage.setItem(ACCES_TOKEN, res.data.access)
        localStorage.setItem(REFRESH_TOKEN, res.data.refresh)
        setDialogIsOpen(false)
        // console.log('User est resté connecté')
        clearTimeout(sessionInactifTimerRef.current)
        clearTimeout(inactifTimerRef)
      } else {
        logout()
      }
    } catch (error) {
      console.error(error)
      logout()
    }
  }

  const refreshToken = async () => {
    try {
      // console.log('refresh still actif')
      if (CONTEXT === ('aphp' || 'arkhn' || 'chut')) {
        const res = await axios.post(`${BACK_API_URL}/accounts/refresh/`)

        if (res.status === 200) {
          localStorage.setItem(ACCES_TOKEN, res.data.access)
          localStorage.setItem(REFRESH_TOKEN, res.data.refresh)
        } else {
          logout()
        }
      }
    } catch (error) {
      console.error(error)
      logout()
    }
  }

  useEffect(() => {
    if (me !== null) {
      refreshToken()
      setRefreshInterval(
        setInterval(() => {
          refreshToken()
        }, 3 * 60 * 1000)
      )
    } else if (me == null) {
      clearInterval(refreshInterval)
    }
  }, [me])

  if (!me) return <></>

  return (
    <div>
      <Dialog open={dialogIsOpen}>
        <DialogContent>
          <DialogContentText variant="button" className={classes.title}>
            Vous allez être déconnecté car vous avez été inactif pendant 14 minutes.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={stayActive} className={classes.validateButton}>
            Restez connecté
          </Button>
          <Button onClick={logout}>Déconnexion</Button>
        </DialogActions>
      </Dialog>
      <IdleTimer ref={inactifTimerRef} timeout={13 * 60 * 1000} onIdle={onIdle}></IdleTimer>
    </div>
  )
}

export default AutoLogoutContainer
