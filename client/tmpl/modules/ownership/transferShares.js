// @flow
import { Template } from 'meteor/templating'
import { FlowRouter } from 'meteor/kadira:flow-router'
import { TemplateVar } from 'meteor/frozeman:template-var'
import { ReactivePromise } from 'meteor/deanius:promise'

import ClosableSection from '/client/tmpl/components/closableSection'
import StockWatcher from '/client/lib/ethereum/stocks'
import { Stock } from '/client/lib/ethereum/contracts'
import Tokens from '/client/lib/ethereum/tokens'
import { dispatcher } from '/client/lib/action-dispatcher'

const Stocks = StockWatcher.Stocks

const transferStock = async (address: string, to: string, amount: number) => {
  return await dispatcher.performTransaction(Stock.at(address).transfer, to, amount)
}

const tmpl = Template.Module_Ownership_TransferShares.extend([ClosableSection])
const selectedStock = new ReactiveVar()

tmpl.onRendered(function () {
  this.$('.form').form({
    onSuccess: async (e) => {
      e.preventDefault()
      this.$('.dimmer').trigger('loading')

      const amount = this.$('input[name=number]').val()
      const recipient = TemplateVar.get(this, 'recipient').ethereumAddress

      const stock = selectedStock.get()
      await transferStock(stock.address, recipient, amount)

      this.$('.dimmer').trigger('finished', { state: 'success' })
      return false
    },
  })
})

tmpl.helpers({
  stocks: () => Stocks.find(),
  transferrable: ReactivePromise(Tokens.getTransferableBalance),
  selectedStock: () => selectedStock.get(),
})

tmpl.events({
  'select .identityAutocomplete': (e, instance, user) => (TemplateVar.set('recipient', user)),
  'change select': (e) => {
    const address = e.target.value
    let stock = Stocks.findOne({ address })
    if (!stock) {
      const wrappedStock = Stocks.findOne({ 'parentToken.address': address })
      stock = wrappedStock.parentToken
    }
    selectedStock.set(stock)
  },
  'success .dimmer': () => FlowRouter.go('/ownership'),
})
