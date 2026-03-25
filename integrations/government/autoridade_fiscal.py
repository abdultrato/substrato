class TaxAuthority:
    def send_invoice(self, date):
        pass


AutoridadeFiscal = TaxAuthority
TaxAuthority.enviar_invoice = TaxAuthority.send_invoice
